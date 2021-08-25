import { Express, Request, Response, NextFunction } from "express";
import Mongoose from "mongoose";
import LabelledItemModel from "./item.model";
import JobController from "../job/job.controller";
import JobModel from "../job/job.model";
import BatchController from "../batch/batch.controller";
import BatchModel from "../batch/batch.model";

const numItemsAggregated = 4;
const desiredBatchSize = 10;
let ItemController = {
  addItem: async (req: Request, res: Response, next: NextFunction) => {
    // get job Id from request body
    var jobID = req.body.jobID;

    // gets file uploaded from request and create new labelled item object
    var newLabelledItemObject;

    // update the data preview for the job
    var aggImages = Array<any>();
    var storedImages = Array<any>();

    //total number of batches given # of images
    const totalBatches = Math.max(
      Math.round((req.files.length as number) / desiredBatchSize),
      1
    );

    // adds batch size to parent job (leave await here or it doesnt work [???])
    await JobModel.findByIdAndUpdate(jobID, { total_batches: totalBatches });

    for (let i = 0; i < totalBatches; i++) {
      BatchController.create(i, Mongoose.Types.ObjectId(jobID));
    }

    for (var i = 0; i < req.files.length; i++) {
      // creates the new labelled item json object
      newLabelledItemObject = {
        value: (req.files as Express.Multer.File[])[i].filename,
        job: jobID,
        batchNumber: i % totalBatches,
      };

      // create a mongoose labelled item object
      let newLabelledItem = new LabelledItemModel(newLabelledItemObject);

      if (aggImages.length < numItemsAggregated) {
        aggImages.push(newLabelledItem);
      }

      // save the labelled item in the database
      try {
        const itemResponse = await newLabelledItem.save();
      } catch (err) {
        // something went wrong when saving the image
        res.status(500).send({
          message: err.message || "Some error occurred while saving the image.",
        });
        return;
      }
    }

    res.status(200).send("OK");
  },

  findAll: async (req: Request, res: Response, next: NextFunction) => {
    // return all the data for the specified job
    LabelledItemModel.find({ job: req.query.jobID })
      .then((items: any) => {
        res.send(items);
      })
      .catch((err: any) => {
        // something went wrong when getting the job
        res.status(500).send({
          message: err.message || "Some error occurred while retrieving jobs.",
        });
      });
  },

  removeUserLabels: async (
    jobId: Mongoose.Types.ObjectId,
    batchNumber: number,
    userId: Mongoose.Types.ObjectId
  ) => {
    // find all the image belonging to this batch in this job
    // remove the labels assigned by this user from all of them
    // returns a boolean value indicating if the operations were successful or not
    const result = await LabelledItemModel.updateMany(
      {
        job: jobId,
        batchNumber: batchNumber,
      },
      { $pull: { labels: { labeller: userId } } }
    );

    return result ? true : false;
  },
};

export default ItemController;
