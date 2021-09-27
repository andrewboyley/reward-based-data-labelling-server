import { Request, Response, NextFunction } from "express";
import Mongoose, { Schema } from "mongoose";
import JobModel from "../job/job.model";
import ItemController from "../LabelledItem/item.controller";
import BatchModel from "./batch.model";
import UserModel from "../user/user.model";
import multer from "multer"; // DO NOT REMOVE - typescript things
import JobController from "../job/job.controller";

async function removeUserLabels(
  batch: any,
  userId: Mongoose.Types.ObjectId
): Promise<boolean> {
  // remove the image labels assigned by this user to this batch
  // return a flag indicating success
  return await ItemController.removeUserLabels(
    batch.job,
    batch.batch_number,
    userId
  );
}

async function removeUserFromBatch(
  batchId: Mongoose.Types.ObjectId,
  userId: Mongoose.Types.ObjectId
): Promise<boolean> {
  // remove the user from this batch
  // return a flag indicating success
  const result = await BatchModel.findByIdAndUpdate(
    batchId,
    { $pull: { labellers: { labeller: userId } } },
    { new: true }
  );

  return result ? true : false;
}

let BatchController = {
  create: async (batchNumber: number, jobID: Mongoose.Types.ObjectId) => {
    BatchModel.create({ batch_number: batchNumber, job: jobID }).then(
      (batch: any) => {}
    );
  },

  findAll: async (req: Request, res: Response, next: NextFunction) => {
    // return all the jobs
    BatchModel.find()
      .then((batch: any) => {
        res.send(batch);
      })
      .catch((err: any) => {
        // some error occurred
        res.status(500).send({
          message:
            err.message || "Some error occurred while retrieving batches.",
        });
      });
  },

  findOneComplete: async (req: Request, res: Response, next: NextFunction) => {
    // receive batchID as a param
    // find the batch number and the job id
    // find all the associated images, and return them as well

    BatchModel.findById(req.params.id)
      .then((batch: any) => {
        if (!batch) {
          // no batch with ID found
          return res.status(404).json({
            message: "Batch not found with id " + req.params.id,
          });
        }

        // batch found
        // need to get related images
        ItemController.findImagesInBatch(batch.job, batch.batch_number)
          .then((images: any) => {
            if (images) {
              // these images are all valid
              // add them to the batch object
              batch = batch.toObject();

              // in the labels array, remove all users except the current user
              // reassign the .labels property to a single object of this user's label(s)
              for (let i = 0; i < images.length; i++) {
                let image = images[i];

                image = image.toObject();

                // loop through the labellers, looking for the current user
                let temp: any = image.labels;
                image.labels = {};
                for (let labels of temp) {
                  // check if the labeller is the current user
                  if (String(labels.labeller) == String(req.body.userId)) {
                    // reassign this (labeller, value) pair to the labels property
                    image.labels = labels;

                    // don't need to check the rest
                    break;
                  }
                }

                images[i] = image;
              }

              batch.images = images;

              // return the entire batch
              res.status(200).json(batch);
            } else {
              // if images is null, something went wrong
              return res.status(500).json({
                message:
                  "Something went wrong retrieving batch " + req.params.id,
              });
            }
          })
          .catch((err: any) => {
            return res.status(500).json({ message: err.message });
          });
      })
      .catch((err: any) => {
        return res.status(500).json({ message: err.message });
      });
  },

  findLabellerExpiry: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // get the batch
    BatchModel.findById(req.params.id)
      .then((batch: any) => {
        if (!batch) {
          // no batch found with this id
          return res.status(404).send({
            message: "Batch not found with id " + req.params.id,
          });
        }

        // we have the batch
        // look through it and find the current user as a labeller
        for (let labeller of batch.labellers) {
          if (String(labeller.labeller) === String(req.body.userId)) {
            // we have found us
            // return the associated expiry time
            return res.status(200).json({
              expiry: labeller.expiry,
            });
          }
        }

        // if we get here, then we were not found as a labeller - return an error
        return res.status(401).json({
          message: "User is not a labeller for this batch",
        });
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          // something was wrong with the id - it was malformed
          return res.status(422).send({
            message: "Malformed batch id " + req.params.id,
          });
        }

        // some other error occurred
        return res.status(500).send({
          message: "Error retrieving batch with id " + req.params.id,
        });
      });
  },

  determineAvailableBatches: async (
    userId: Mongoose.Types.ObjectId,
    jobId: Mongoose.Types.ObjectId,
    numLabellersRequired: number
  ) => {
    // return valid batches, or an empty arr

    // find all batches in this job that:
    // 1) we have not labelled before
    // 2) can still be labelled
    // todo - check if this does work, or if $elemMatch is needed
    const batches: any = await BatchModel.find({
      job: jobId, // get batches in the desired job
      "labellers.labeller": { $ne: userId }, // satisfies (1)
    }).$where("this.labellers.length < " + numLabellersRequired); // satisfies (2)

    if (batches === null) {
      // something went wrong, return null
      return null;
    } else {
      // all these batches are available to us still
      // return valid batches
      // return batches.length === 0 ? {} : batches;
      return batches;
    }
  },

  findNext: async (req: Request, res: Response, next: NextFunction) => {
    // return the next batch, if it exists
    // else return empty obj

    // userID is in the request (has passed through VerifyToken)
    // jobID is in the req.params

    // extract the user id from the request
    const userObjectId = new Mongoose.Types.ObjectId(req.body.userId);

    // get this job
    const job: any = await JobModel.findById(req.params.job);
    if (job === null)
      return res.status(404).json({ error: "Job does not exist" });

    // check that we did not author this job happened in previous request
    // only time a call will be made directly here is when have already done a batch in this job

    // determine available batches for this job
    const batches = await BatchController.determineAvailableBatches(
      userObjectId,
      job._id,
      job.numLabellersRequired
    );

    if (batches !== null) {
      // nothing went wrong
      // return empty obj if no batch available, otherwise return a single batch
      res.status(200).json(batches.length === 0 ? "No Batch" : batches[0]);
    } else {
      // something went wrong
      return res.status(400).json({ error: "Something went wrong" });
    }
  },

  addLabeller: async (req: Request, res: Response, next: NextFunction) => {
    // check that a labeller has been provided
    if (!req.body) {
      return res.status(400).send({
        message: "Data not receive correctly",
      });
    }

    // add the labeller to the job's batch
    await BatchModel.findByIdAndUpdate(
      req.params.batch,
      { $push: { labellers: { labeller: req.body.userId } } },
      { new: true }
    )
      .then((batch: any) => {
        if (!batch) {
          // invalid batch id was provided

          return res.status(404).send({
            message: "Batch not found with id " + req.params.batch,
          });
        }
        // return successful update - 204 means no body (not required for PUT)
        res.status(200).send(batch);
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          // something was wrong with the job id
          return res.status(404).send({
            message: "Batch not found with id " + req.params.batch,
          });
        }

        // something else went wrong
        console.log("500");
        return res.status(500).send({
          message: "Error updating batch with id " + req.params.batch,
        });
      });
  },

  removeLabeller: async (req: Request, res: Response, next: NextFunction) => {
    // remove the labeller from the batch IF:
    // (1) the batch is NOT completed for user
    // if we do remove the labeller from the batch, we need to clean up the image labels from this batch

    // batchID is in params
    BatchModel.findById(req.params.batch)
      .then(async (batch: any) => {
        // batch with that ID doesn't exist
        if (!batch) {
          return res.status(404).send({
            message: "Batch not found with id " + req.params.batch,
          });
        }

        // we now have the batch

        // get the correct labeller doing that batch
        const labeller = batch.labellers.find((element: any) => {
          if (
            Mongoose.Types.ObjectId(element.labeller).equals(
              Mongoose.Types.ObjectId(req.body.userId)
            )
          ) {
            return element;
          }
        });

        // check the completed flag
        if (labeller.completed === false) {
          // valid remove operation
          // (1) remove the image labels assigned by this user

          if (await removeUserLabels(batch, req.body.userId)) {
            // remove labels was successful
            // (2) remove the user from this batch's labellers
            if (await removeUserFromBatch(batch._id, req.body.userId)) {
              // successful
              res.status(204).send();
            } else {
              // something went wrong
              res.status(400).send({
                message:
                  "The image labels were removed, but an error occurred removing the user as a labeller",
              });
            }
          } else {
            //remove labels was unsuccessful
            res.status(400).send({
              message: "An error occurred whilst removing image labels",
            });
          }
        } else {
          // trying to remove from a completed job ??????
          res.status(400).send({
            message: "Cannot remove user from a completed batch",
          });
        }
      })
      .catch((error: any) => {
        if (error.kind === "ObjectId") {
          // something was wrong with the id - it was malformed
          return res.status(404).send({
            message: "Batch not found with id " + req.params.batch,
          });
        }

        // some other error occurred
        console.log(error);
        return res.status(500).send({
          message: "Error retrieving batch with id " + req.params.batch,
        });
      });
  },

  finishJob: async (req: Request, res: Response, next: NextFunction) => {
    // update this particular batch for this user
    // if (!req.params.batch) {
    // 	return res.status(422).send({ message: "Batch ID not present" });
    // }

    // find the batch to update
    BatchModel.findById(req.params.batch)
      .then((batch: any) => {
        // check we actually have the batch
        if (!batch) {
          return res
            .status(404)
            .send({ message: "Batch not found with ID " + req.params.batch });
        }

        // update the labels array
        for (let i = 0; i < batch.labellers.length; i++) {
          const labeller = batch.labellers[i];
          if (String(labeller.labeller) === String(req.body.userId)) {
            // this is the current user
            batch.labellers[i].completed = true;

            // don't look any further
            break;
          }
        }

        // save the changes
        batch
          .save()
          .then((updatedBatch: any) => {
            // update performed successfully
            return res.status(204).send();
          })
          .catch((err: any) => {
            if (err.message) {
              res.status(422).send({
                message: err.message,
              });
            } else {
              // some other error occurred
              res.status(500).send({
                message: "Some error occurred while updating the batch status.",
              });
            }
          });
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          // something was wrong with the id - it was malformed
          return res.status(404).send({
            message: "Batch not found with id " + req.params.batch,
          });
        }

        // some other error occurred
        return res.status(500).send({
          message: "Error retrieving batch with id " + req.params.batch,
        });
      });
  },

  /*setReward: async (req: Request, res: Response, next: NextFunction) => {
    // set the reward available to claim by the user

    // find the user to update
    BatchModel.findById(req.params.batch)
      .then((batch: any) => {
        // check we actually have the batch
        if (!batch) {
          return res
            .status(404)
            .send({ message: "Batch not found with ID " + req.params.batch });
        }

        //find the job that the batch belongs to
          //calculate reward as reward/labellers/batchamount
        //batch.job

        // update the labels array
        for (let i = 0; i < batch.labellers.length; i++) {
          const labeller = batch.labellers[i];
          if (String(labeller.labeller) === String(req.body.userId)) {
            // this is the current user
            batch.labellers[i].completed = true;

            // don't look any further
            break;
          }
        }

        // save the changes
        batch
          .save()
          .then((updatedBatch: any) => {
            // update performed successfully
            return res.status(204).send();
          })
          .catch((err: any) => {
            if (err.message) {
              res.status(422).send({
                message: err.message,
              });
            } else {
              // some other error occurred
              res.status(500).send({
                message: "Some error occurred while updating the batch status.",
              });
            }
          });
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          // something was wrong with the id - it was malformed
          return res.status(404).send({
            message: "Batch not found with id " + req.params.batch,
          });
        }

        // some other error occurred
        return res.status(500).send({
          message: "Error retrieving batch with id " + req.params.batch,
        });
      });
  },*/

  updateReward: async (req: Request, res: Response, next: NextFunction) => {
    // update the amount of reward the user has available
    let user: any;

    // find the user to update
    UserModel.findById(req.body.userId)
      .then((response: any): any => {
        user = response;
        // check we actually have the user
        if (!user) {
          return res
            .status(404)
            .send({ message: "User not found with ID " + req.body.userId });
        }

        //find the reward amount
        JobModel.findById(req.params.job)
          .then((job: any) => {
            if (!job) {
              return res
                .status(404)
                .send({ message: "Job not found with ID " + req.params.job });
            }

            let reward =
              job.rewards / job.numLabellersRequired / job.total_batches;

            // update the reward amount in user
            user.rewardCount = user.rewardCount + reward;

            // save the changes
            user
              .save()
              .then((updatedUser: any) => {
                // update performed successfully
                return res.status(200).send({
                  reward: updatedUser.rewardCount,
                });
              })
              .catch((err: any) => {
                if (err.message) {
                  res.status(422).send({
                    message: err.message,
                  });
                } else {
                  // some other error occurred
                  res.status(500).send({
                    message:
                      "Some error occurred while updating the user reward amount.",
                  });
                }
              });
          })
          .catch((err: any) => {
            if (err.kind === "ObjectId") {
              // something was wrong with the id - it was malformed
              return res.status(422).send({
                message: "Malformed Job id " + req.params.job,
              });
            }

            // some other error occurred
            return res.status(500).send({
              message: "Error retrieving job with id " + req.params.job,
            });
          });

        //continues in the promise chain
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          // something was wrong with the id - it was malformed
          return res.status(422).send({
            message: "Malformed User id " + req.body.userId,
          });
        }

        // some other error occurred
        return res.status(500).send({
          message: "Error retrieving user with id " + req.body.userId,
        });
      });
  },

  batchProgress: async (jobID: Mongoose.Types.ObjectId) => {
    // find the number total bataches completed for a specific job
    const batchesCompleted: any = await BatchModel.aggregate([
      {
        $match: {
          job: jobID,
        },
      },
      {
        $group: {
          _id: "$job",
          count: {
            $sum: {
              $size: {
                $filter: {
                  input: "$labellers.completed",
                  cond: "$$this",
                },
              },
            },
          },
        },
      },
    ]);

    // find the number total bataches not completed for a specific job
    const denom: any = await JobModel.find(
      {
        _id: jobID,
      },
      {
        numLabellersRequired: 1,
        total_batches: 1,
      }
    );

    //retrieve the values from the query output
    const total_batches_completed = Number(
      Object.values(batchesCompleted[0])[1]
    );
    const total_numLabellersNeeded = Number(denom[0]["numLabellersRequired"]);
    const total_numBatches = Number(denom[0]["total_batches"]);

    //special case: when both are 0 return progress as zero to avoid null value in the total calculation
    if (
      total_batches_completed == 0 &&
      (total_numLabellersNeeded == 0 || total_numBatches == 0)
    ) {
      return [{ progress: 0 }];
    }

    // calculate the job completion percentage
    const total_progress =
      (total_batches_completed /
        (total_numLabellersNeeded * total_numBatches)) *
      100;

    //return the total progress of a job as a json
    return [{ progress: total_progress }];
  },

  findProgress: async (req: Request, res: Response, next: NextFunction) => {
    //get the job
    const job: any = await JobModel.findById(req.params.job);
    if (job === null)
      return res.status(404).json({ error: "Job does not exist" });

    //find the progress for the job
    const jobprogress = await BatchController.batchProgress(job._id);
    // return empty obj if there is no progress, otherwise return the progress
    if (jobprogress !== null) {
      // nothing went wrong
      // return empty obj if no batch available, otherwise return a single batch
      res.status(200).json(jobprogress);
    } else {
      // something went wrong
      return res
        .status(400)
        .json({ error: "Something went wrong with getting the job progress" });
    }
  },
};

async function manageExpiry() {
  console.log("Checking if any batches have expired...");
  // get all batches where the current time is greater than or equal to the expiry time, and flag is false
  const currentTime = new Date().toISOString();

  await BatchModel.find({
    labellers: {
      $elemMatch: { completed: false, expiry: { $lt: currentTime } }, // batch not completed AND expiry time is less than current time
    },
  })
    .then(async (batches: any) => {
      // these batches have expired

      // loop through the batches
      for (let batch of batches) {
        // valid remove operation

        // loop through all the users labelling this batch
        const labellers = JSON.parse(JSON.stringify(batch.labellers)); // make a deep copy
        for (let labeller of labellers) {
          // check if this labeller has expired
          if (labeller.completed === false && labeller.expiry < currentTime) {
            // labeller has expired
            // make the labeller give up the job
            const userId = Mongoose.Types.ObjectId(labeller.labeller);

            // (1) remove the image labels assigned by this user
            if (await removeUserLabels(batch, userId)) {
              // remove labels was successful
              // (2) remove the user from this batch's labellers
              if (await removeUserFromBatch(batch._id, userId)) {
                // successful
                console.log(userId + " removed");
              } else {
                // something went wrong
                console.error(
                  "The image labels were removed, but an error occurred removing the user as a labeller"
                );
              }
            } else {
              //remove labels was unsuccessful
              console.error("An error occurred whilst removing image labels");
            }
          }
        }
      }
    })
    .catch((err: any) => {
      console.error(err);
    });

  // call remove labeller on each of these batches, for that particular labeller
}

// every 15 minutes, check if a batch has expired
const intervalMinutes = 15;
setInterval(manageExpiry, intervalMinutes * 60 * 1000); // convert to milliseconds

export default BatchController;
export { manageExpiry };
