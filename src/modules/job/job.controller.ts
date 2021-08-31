import { Request, Response, NextFunction } from "express";
import Mongoose, { Schema } from "mongoose";
import BatchController from "../batch/batch.controller";
import BatchModel from "../batch/batch.model";
import JobModel from "./job.model";

async function checkIfBatchIsAvailable(
  job: any,
  userObjectId: Mongoose.Types.ObjectId
) {
  // find any batches that we accepted previously AND which are NOT completed
  let batches: any = await BatchModel.find({
    job: job._id, // get batches in the desired job
    "labellers.labeller": userObjectId, // get batches that I have labelled
    "labellers.completed": false, // we have not completed this batch
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
    BatchModel.distinct("job", {
      "labellers.labeller": userObjectId, // get batches that I have labelled
      "labellers.completed": false, // we have not completed this batch
    })
      .then((batchJobs: any) => {
        // all these jobs are currently in-progress
        // fetch these jobs and return then
        // console.log(Object.values(jobs));
        JobModel.find({
          _id: { $in: batchJobs },
        }).then((jobs: any) => {
          res.send(jobs);
        });
      })
      .catch((err: any) => {
        return res.status(400).json({ error: "Something went wrong" });
      });

    // find all jobs where user is in labellers
    // JobModel.find({
    //   labellers: userObjectId,
    // })
    //   .then((jobs: any) => {
    //     res.json(jobs);
    //   })
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

    // add the labeller to the job
    // JobModel.findByIdAndUpdate(
    //   req.params.id,
    //   { $push: { labellers: req.body.userId } },
    //   { new: true }
    // )
    //   .then((job: any) => {
    //     if (!job) {
    //       // invalid job id was provided
    //       return res.status(404).send({
    //         message: "Job not found with id " + req.params.id,
    //       });
    //     }
    //     // return successful update - 204 means no body (not required for PUT)
    //     res.status(204).send();
    //   })
    //   .catch((err: any) => {
    //     if (err.kind === "ObjectId") {
    //       // something was wrong with the job id
    //       return res.status(404).send({
    //         message: "Job not found with id " + req.params.id,
    //       });
    //     }

    //     // something else went wrong
    //     return res.status(500).send({
    //       message: "Error updating job with id " + req.params.id,
    //     });
    //   });
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
