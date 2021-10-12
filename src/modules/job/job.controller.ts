import { Request, Response, NextFunction } from "express";
import Mongoose, { Schema } from "mongoose";
import BatchController from "../batch/batch.controller";
import BatchModel from "../batch/batch.model";
import ItemController from "../LabelledItem/item.controller";
import userController, { determineUserRating } from "../user/user.controller"
import JobModel from "./job.model";
import UserModel from "../user/user.model";

import fs from "fs";
import path from "path";

async function checkIfBatchIsAvailable(
	job: any,
	userObjectId: Mongoose.Types.ObjectId
) {
	// find any batches that we accepted previously AND which are NOT completed
	let batches: any = await BatchModel.find({
		job: job._id, // get batches in the desired job
		labellers: {
			$elemMatch: { labeller: userObjectId, completed: false },
		},
	});

	// if batches is not empty, means we have in-progress batches still - means job is not availble
	if (batches) {
		if (batches.length !== 0) return false;
	} else {
		return false;
	}

	// have no in-progress batches, check if there are still batches we can accept
	batches = await BatchController.determineAvailableBatches(
		userObjectId,
		job._id,
		job.numLabellersRequired
	);

	// if batches is null, an error occurred
	// if batches array is not empty, have an available batch
	// job is valid if it has a valid, non-empty batch
	return batches !== null && batches.length !== 0;
}

async function isJobCompleted(
	jobId: Mongoose.Types.ObjectId
): Promise<boolean> {
	// we need to check that ((num batches) x (num labellers required)) batches are "completed"

	// get the number of batches and the number of labellers required for this job
	const job: any = await JobModel.findById(jobId);

	// job not found
	if (!job) return false;

	// job found - determine desired "completed" number
	const desiredNumber: number = job.total_batches * job.numLabellersRequired;

	// count the number of completed batches for this job
	const batches: any = await BatchModel.find({
		job: jobId,
		labellers: {
			$elemMatch: {
				completed: true,
			},
		},
	});

	// no batches found
	if (!batches || batches.length === 0) return false;

	// batches found - loop through and count
	let actualNumber: number = 0;
	for (let batch of batches) {
		// loop through all the labellers for this batch
		for (let labeller of batch.labellers) {
			// if this is "completed", increment the counter
			if (Boolean(labeller.completed)) {
				actualNumber++;
			}
		}
	}

	// have now counted the number of batches that have actually been labelled
	// check if this is the same as the desired number
	return actualNumber === desiredNumber;
}

async function countCompletedJobsForUser(
	userId: Mongoose.Types.ObjectId
): Promise<number> {
	// we need to get all the jobs that have a batch labelled by the user
	// count how many of these jobs are completed

	// get the job IDs that have a batch completely labelled by the current user
	const distinctJobs = await BatchModel.distinct("job", {
		labellers: {
			$elemMatch: { labeller: userId, completed: true },
		},
	});

	// for these jobs, count how many are completed
	let counter: number = 0;
	for (let job of distinctJobs) {
		if (await isJobCompleted(Mongoose.Types.ObjectId(job))) {
			// if the job is completed, increment the counter
			counter++;
		}
	}

	return counter;
}

let JobController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    // Validate request

    // body never empty - been authorised
    if (!req.body) {
      return res.status(422).send({
        message: "Job content can not be empty",
      });
    }

    // repackage the user id to suit the job model
    req.body.author = req.body.userId;
    delete req.body.userId;

    // create the new job
    let newJob = new JobModel(req.body);

    // save the job
    newJob
      .save()
      .then((data: any) => {
        // job created successfully - return the created object
        res.status(201).send(data);
      })
      .catch((err: any) => {
        if (err.message) {
          // something was wrong with the job data
          res.status(422).send({
            message: err.message,
          });
        } else {
          // some other error occurred
          res.status(500).send({
            message: "Some error occurred while creating the job.",
          });
        }
      });
  },

  findAll: async (req: Request, res: Response, next: NextFunction) => {
    // return all the jobs
    JobModel.find()
      .then((job: any) => {
        res.send(job);
      })
      .catch((err: any) => {
        // some error occurred
        res.status(500).send({
          message: err.message || "Some error occurred while retrieving jobs.",
        });
      });
  },

  findOne: async (req: Request, res: Response, next: NextFunction) => {
    // find job with the given id
    JobModel.findById(req.params.id)
      .then(async (job: any) => {
        if (!job) {
          // the job with that id doesn't exist
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }

        // can the current user accept this job
        const currentUserId = req.body.userId; // DO NOT TOUCH

        job = job.toObject();

        // check I am not the author
        let canAccept: boolean = job.author != currentUserId; // DO NOT TOUCH

        if (canAccept) {
          // I am not the author

          // check that we are not currently labelling a batch
          // AND that there are still batches for us
          canAccept =
            canAccept && (await checkIfBatchIsAvailable(job, currentUserId));
        }

        // add the flag to the response
        job.canAccept = canAccept;

        // return the job
        res.status(200).send(job);
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          // something was wrong with the id - it was malformed
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }

        // some other error occurred
        return res.status(500).send({
          message: "Error retrieving job with id " + req.params.id,
        });
      });
  },

  // find available jobs - jobs that aren't mine and I haven't accepted
  // need user id
  findAvailable: async (req: Request, res: Response, next: NextFunction) => {
    // extract the user id from the request
    const userObjectId = new Mongoose.Types.ObjectId(req.body.userId);

    // find all jobs where user is not the author
    // AND where if user is labeller
    // AND where there are still labelling slots on a batch available
    JobModel.find({
      author: { $ne: userObjectId },
    })
      .then(async (jobs: any) => {
        // all these jobs were not authored by us
        const availableJobs = [];

        // need to check the batches - not labelled, and still labelling slots open
        for (let job of jobs) {
          // check if this job has a batch available to this user
          if (await checkIfBatchIsAvailable(job, userObjectId)) {
            // if a batch is available to accept, then this job is available to accept
            availableJobs.push(job);
          }
        }

        res.json(availableJobs);
      })
      .catch((err: any) => {
        return res.status(400).json({ error: "Something went wrong" });
      });
  },

  // find my job - jobs that I uploaded
  // need user id
  findAuthored: async (req: Request, res: Response, next: NextFunction) => {
    // extract the user id from the request
    const userObjectId = new Mongoose.Types.ObjectId(req.body.userId);

    // find all jobs where user is the author
    JobModel.find({
      author: userObjectId,
    })
      .then((jobs: any) => {
        res.json(jobs);
      })
      .catch((err: any) => {
        return res.status(400).json({ error: "Something went wrong" });
      });
  },

  // find accepted jobs - jobs that aren't mine and I am labelling an in-progress batch
  // need user id
  findAccepted: async (req: Request, res: Response, next: NextFunction) => {
    // extract the user id from the request
    const userObjectId = new Mongoose.Types.ObjectId(req.body.userId);

    // find all batches where user is a labeller AND is not completed
    BatchModel.find({
      labellers: {
        $elemMatch: { labeller: userObjectId, completed: false },
      },
    })
      .then(async (batchJobs: any) => {
        // all these jobs are currently in-progress
        // fetch these jobs and return then

        const acceptedJobs = [];

        // loop through the batches which the user is currently labelling
        for (let batch of batchJobs) {
          // get the corresponding job
          let job: any = await JobModel.findById(batch.job);

          // check the job is valid
          if (job) {
            // add the batch ID that triggered the 'accept' to the job object
            job = job.toObject();
            job.batch_id = batch._id;

            // add the modified job to an array, which will be returned
            acceptedJobs.push(job);
          }
        }

        // return all the accepted jobs, with the batch id that triggered the 'accept'
        res.status(200).json(acceptedJobs);
      })
      .catch((err: any) => {
        return res.status(400).json({ error: "Something went wrong" });
      });
  },

  // find completed jobs - any job that I have finished labelling a batch in
  findCompleted: async (req: Request, res: Response, next: NextFunction) => {
    // extract the user id from the request
    const userObjectId = new Mongoose.Types.ObjectId(req.body.userId);

    // find all batches where user is a labeller AND is completed
    BatchModel.distinct("job", {
      labellers: {
        $elemMatch: { labeller: req.body.userId, completed: true },
      },
    })
      .then(async (jobIDs: any) => {
        // all these jobs are completed
        // fetch these jobs and return then

        const jobs = [];

        // loop through the batches which the user is currently labelling
        for (let jobID of jobIDs) {
          // get the corresponding job
          let job: any = await JobModel.findById(jobID);

          // check the job is valid
          if (job) {
            jobs.push(job);
          }
        }

        // return all the accepted jobs, with the batch id that triggered the 'accept'
        res.status(200).json(jobs);
      })
      .catch((err: any) => {
        return res.status(400).json({ error: "Something went wrong" });
      });
  },

  // return a single job, with all the images, with their labels
  findJobLabels: async (req: Request, res: Response, next: NextFunction) => {
    // 1) find the specified job
    // 2) retrieve all the images in this job
    // 3) determine the actual assigned labels to the images

    // make sure we have an id
    if (!req.params.id) {
      return res.status(422).send({
        message: "Job ID not provided",
      });
    }

    // get job
    JobModel.findById(req.params.id)
      .then(async (job: any) => {
        // double check we have a job
        if (!job) {
          return res.status(404).json({
            message: "Job not found with id " + req.params.id,
          });
        }

        // we have the job - check that we are the author of this job
        if (String(job.author) !== req.body.userId) {
          // we are not the author - can't view the job labels
          return res.status(401).json({
            message: "You are not authorised to view this job's labels",
          });
        }

        // we now have a valid request and data
        // now we need to get the images with the correct labels
        job = job.toObject();
        let images = await ItemController.determineImageLabelsInJob(job._id);

        if (images) {
          job.images = images;
          res.status(200).json(job);
        } else {
          // images is null - error occurred
          res.status(500).json({
            message:
              "An error occurred while processing the labels for this job",
          });
        }
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          // something was wrong with the id - it was malformed
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }

        // some other error occurred
        return res.status(500).send({
          message: "Error retrieving job with id " + req.params.id,
        });
      });
  },

	// return a job where each labeller of an image, had chosen the correct label
	findAvgLabelRatings: async (
		req: Request,
		res: Response,
		next: NextFunction
	) => {
		// 1) find the specified job
		// 2) get the majority labels for each image
		// 3) get the users that labelled each image correctly
		// 4) calculate the average user rating of each user who submitted that label
		// 5) return the average rating for each image

		// make sure we have an id
		if (!req.params.id) {
			return res.status(422).send({
				message: "Job ID not provided",
			});
		}

		// we now have a valid request and data
		// now we need to get the correct labels
		// the image info
		JobModel.findById(req.params.id).then(async (job: any) => {
			// 		// double check we have a job
			if (!job) {
				return res.status(404).json({
					message: "Job not found with id " + req.params.id,
				});
			}
	
			
			let labellersArr = await ItemController.determineLabellersInJob(job._id);
			

			if(labellersArr == null){
				return res.status(404).json({
					message: "Problem getting labellers",
				});
			}


			let avgRatings= new Array<number>(labellersArr.length);
			for (let index = 0; index < labellersArr.length; index++) {
				avgRatings[index] = 0;
			}
			let imageLabellers = new Set();
			let rating;
			for (let index = 0; index < labellersArr.length; index++) {
				imageLabellers = labellersArr[index];

				for(let l of imageLabellers){
					let str = l + "";
					rating = await determineUserRating(Mongoose.Types.ObjectId(str));
					if(Number.isNaN(rating)){
						avgRatings[index] += 0;

					}else{
						avgRatings[index] += rating;

					}
				}
				
				avgRatings[index] = avgRatings[index]/imageLabellers.size; 
				
			}

			res.status(200).json(avgRatings);
			

		})
		.catch((err: any) => {
		if (err.kind === "ObjectId") {
			// something was wrong with the id - it was malformed
			return res.status(404).send({
			message: "Job not found with id " + req.params.id,
			});
		}

		//   some other error occurred
		console.log(err);
		return res.status(500).send({
			message: "Error retrieving job with id " + req.params.id,
		});
		});

  },

  // generate a csv file with the job labels
  exportJob: async (req: Request, res: Response, next: NextFunction) => {
    // make sure we have an id
    // if (!req.params.id) {
    //   return res.status(422).send({
    //     message: "Job ID not provided",
    //   });
    // }

    // set up the file path
    const filepath = "./exports/" + req.params.id + ".csv";

    // determine the file's data
    let data: string = "";
    const fieldDelimiter = ",";
    const arrayDelimiter = ";";

    // get the image data
    JobModel.findById(req.params.id)
      .then(async (job: any): Promise<boolean> => {
        // double check we have a job
        if (!job) {
          res.status(404).json({
            message: "Job not found with id " + req.params.id,
          });

          return false;
        }

        // we have the job - check that we are the author of this job
        if (String(job.author) !== req.body.userId) {
          // we are not the author - can't view the job labels
          res.status(401).json({
            message: "You are not authorised to export this job",
          });

          return false;
        }

        // we now have a valid request and data
        // now we need to get the images with the correct labels
        job = job.toObject();
        let images = await ItemController.determineImageLabelsInJob(job._id);

        if (!images) {
          // images is null - error occurred
          res.status(500).json({
            message:
              "An error occurred while processing the labels for this job",
          });

          return false;
        } else {
          // assign images to data

          // write the "header line"
          data +=
            "image_filename" +
            fieldDelimiter +
            "first_label" +
            arrayDelimiter +
            "second_label" +
            arrayDelimiter +
            "other_labels\n";

          // write the image data
          for (let i = 0; i < images.length; i++) {
            const image = images[i];
            // write the filename
            let imageString = image.value + fieldDelimiter;
            for (let assignedLabel of image.assignedLabels) {
              // write the labels in order
              imageString += assignedLabel + arrayDelimiter;
            }
            // remove the last delimiter
            data += imageString.slice(0, -1);

            if (i !== images.length - 1) {
              // add a newline, provided this is not the last line
              data += "\n";
            }
          }

          return true;
        }

        // return images;
      })
      .then((status: any) => {
        if (!status) {
          // images is also used as a flag
          // if it is null, a response has already been sent
          return;
        }

        // create the file, and return it, then remove the file
        fs.writeFile(filepath, data, (err: any) => {
          if (err) {
            // an error occurred - return failed
            return res.status(500).json({
              message: err.code,
            });
          } else {
            res.sendFile(path.resolve(filepath), (err: any) => {
              // once the file has been sent, remove it
              fs.unlink(filepath, (err: any) => {
                if (err) console.error(err);
              });
            });
          }
        });
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          // something was wrong with the id - it was malformed
          return res.status(422).json({
            message: "Malformed job id " + req.params.id,
          });
        }

        // some other error occurred
        return res.status(500).send({
          message: "Error retrieving job with id " + req.params.id,
        });
      });
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    // check that content to update has been provided
    if (!req.body) {
      return res.status(400).send({
        message: "Job content can not be empty",
      });
    }

    // find the job and update it
    JobModel.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .then((job: any) => {
        if (!job) {
          // no job with thattt id exists
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }

        // return updated job
        res.send(job);
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          // something was wrong with the job id
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }

        // some other error occurred
        return res.status(500).send({
          message: "Error updating job with id " + req.params.id,
        });
      });
  },

  addLabeller: async (req: Request, res: Response, next: NextFunction) => {
    /* 
    
    This function will only be called the first time a user accepts the job.
    They should be assigned a batch.
    Later, a direct call to the Batches will be made to accept another batch
    
    */

    // check that a labeller has been provided
    if (!req.body) {
      return res.status(400).send({
        message: "Data not recieved correctly",
      });
    }

    // get the job we want to accept
    JobModel.findById(req.params.id)
      .then(async (job: any) => {
        if (!job) {
          // invalid job id was provided
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }

        // job is valid

        // find an available batch to accept
        const batches = await BatchController.determineAvailableBatches(
          req.body.userId,
          job._id,
          job.numLabellersRequired
        );

        // check batches is valid
        if (batches) {
          // batches is valid

          if (batches.length !== 0) {
            // a batch is available to accept

            // now need to call the accept-batch functions
            // prepare the req parameters for the next function
            req.params.batch = batches[0]._id;
            BatchController.addLabeller(req, res, next);
            return;
          } else {
            // no batch available to accept
            res
              .status(400)
              .send({ message: "No batches available to be accepted" });
          }
        } else {
          res.status(500).send({
            message: "An error occurred whilst finding a batch to accept",
          });
        }
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          // something was wrong with the job id
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }

        // something else went wrong
        return res.status(500).send({
          message: "Error updating job with id " + req.params.id,
        });
      });
  },

  delete: async (req: Request, res: Response, next: NextFunction) => {
    // delete the specified job
    JobModel.findByIdAndRemove(req.params.id)
      .then((job: any) => {
        if (!job) {
          // the job doesn't exist
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }

        // return confirmation of successful delete
        res.status(204).send();
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId" || err.name === "NotFound") {
          // something was wrong with the job id - probs malformed
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }

        // something else went wrong
        return res.status(500).send({
          message: "Could not delete job with id " + req.params.id,
        });
      });
  },
};

export default JobController;
export { checkIfBatchIsAvailable, isJobCompleted, countCompletedJobsForUser };
