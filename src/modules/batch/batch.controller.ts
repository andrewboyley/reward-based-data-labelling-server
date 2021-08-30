import { Request, Response, NextFunction } from "express";
import Mongoose, { Schema } from "mongoose";
import JobModel from "../job/job.model";
import ItemController from "../LabelledItem/item.controller";
import BatchModel from "./batch.model";
import multer from "multer"; // DO NOT REMOVE - typescript things

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

  determineAvailableBatches: async (
    userId: Mongoose.Types.ObjectId,
    jobId: Mongoose.Types.ObjectId,
    numLabellersRequired: number
  ) => {
    // return valid batches, or an empty arr

    // find all batches in this job that:
    // 1) we have not labelled before
    // 2) can still be labelled
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
      res.status(200).json(batches.length === 0 ? {} : batches[0]);
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
    BatchModel.findByIdAndUpdate(
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
      .then((batch: any) => {
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
          ItemController.removeUserLabels(
            batch.job,
            batch.batch_number,
            req.body.userId
          ).then((status: boolean) => {
            if (status) {
              // remove labels was successful
              // (2) remove the user from this batch's labellers
              BatchModel.findByIdAndUpdate(
                req.params.batch,
                { $pull: { labellers: { labeller: req.body.userId } } },
                { new: true }
              )
                .then((updatedBatch: any) => {
                  // successful
                  res.status(204).send();
                })
                .catch((error: any) => {
                  // something went wrong
                  res.status(400).send({
                    message:
                      "The image labels were removed, but an error occurred removing the user as a labeller",
                  });
                });
            } else {
              //remove labels was unsuccessful
              res.status(400).send({
                message: "An error occurred whilst removing image labels",
              });
            }
          });
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
};

// every 5 minutes, check if a batch has expired
const intervalMinutes = 5;
setInterval(function () {
  // get all batches where the current time is greater than or equal to the expiry time, and flag is false
  // call remove labeller on each of these batches, for that particular labeller
}, intervalMinutes * 60 * 1000); // convert to milliseconds

export default BatchController;
