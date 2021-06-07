import { Express, Request, Response, NextFunction } from "express";
import Mongoose from "mongoose";
import LabelledItemModel from "./item.model";
import JobController from "../job/job.controller";

const numItemsAggregated = 4;

let ItemController = {
  addItem: async (req: Request, res: Response, next: NextFunction) => {
    // get job Id from request body
    var jobID = req.body.jobID;

    // gets file uploaded from request and create new labelled item object
    var newLabelledItemObject;

    var aggImages = Array<any>();
    var storedImages = Array<any>();

    for (var i = 0; i < req.files.length; i++) {
      // creates the new labelled item json object
      newLabelledItemObject = {
        value: (req.files as Express.Multer.File[])[i].filename,
        job: jobID,
      };

      // create a mongoose labelled item object
      let newLabelledItem = new LabelledItemModel(newLabelledItemObject);

      if (aggImages.length < numItemsAggregated) {
        aggImages.push(newLabelledItem);
      }

      // save the labelled item in the database
      try {
        const itemResponse = await newLabelledItem.save();
        // res.status(200).send(itemResponse);
      } catch (err) {
        console.log(err.message);
        res.status(500).send({
          message: err.message || "Some error occurred while saving the image.",
        });
        return;
      }
    }

    res.status(200).send("OK");

    // console.log("This is the aggregated data", aggImages);
    // update item aggregation for this job

    // for(var i = 0; i < aggImages.length; i++){
    //   JobController.updateItemAggregation(
    //     new Mongoose.Types.ObjectId(jobID),
    //     aggImages[i]
    //   ).then(() => {
    //     // only send a successful response here, error is handled in the parent catch
    //     res.status(200).send("OK");
    //   });
    // }
  },

  findAll: async (req: Request, res: Response, next: NextFunction) => {
    LabelledItemModel.find({ job: req.query.jobID })
      .then((items: any) => {
        res.send(items);
      })
      .catch((err: any) => {
        res.status(500).send({
          message: err.message || "Some error occurred while retrieving jobs.",
        });
      });
  },
};

export default ItemController;
