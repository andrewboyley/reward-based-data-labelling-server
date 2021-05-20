import { Express, Request, Response, NextFunction } from "express";
import Mongoose from "mongoose";
import LabelledItemModel from "./item.model";
import JobController from "../job/job.controller";

let ItemController = {
  addItem: async (req: Request, res: Response, next: NextFunction) => {
    // get job Id from request body
    var jobID = req.body.jobID;

    // gets file uploaded from request and create new labelled item object
    var newLabelledItemObject;

    for (var i = 0; i < req.files.length; i++) {
      // creates the new labelled item json object
      newLabelledItemObject = {
        value: (req.files as Express.Multer.File[])[i].filename,
        job: jobID,
      };

      // create a mongoose labelled item object
      let newLabelledItem = new LabelledItemModel(newLabelledItemObject);
      // save the labelled item in the database
      newLabelledItem
        .save()
        .then((data: any) => {
          // update item aggregation for this job

          JobController.updateItemAggregation(
            new Mongoose.Types.ObjectId(jobID),
            data._id
          ).then(() => {
            // only send a successful response here, error is handled in the parent catch
            res.status(200).send(data);
          });
        })
        .catch((err: any) => {
          console.log(err.message);
          res.status(500).send({
            message:
              err.message || "Some error occurred while creating the job.",
          });
        });
    }
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
