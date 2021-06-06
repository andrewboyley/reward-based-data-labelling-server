import { Request, Response, NextFunction } from "express";
import Mongoose, { Schema } from "mongoose";
import JobModel from "./job.model";

const numItemsAggregated = 4;

let JobController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    // Validate request

    // body never empty - been authorised

    if (!req.body) {
      return res.status(422).send({
        message: "Job content can not be empty",
      });
    }

    req.body.author = req.body.userId;
    delete req.body.userId;

    let newJob = new JobModel(req.body);

    newJob
      .save()
      .then((data: any) => {
        res.status(201).send(data);
      })
      .catch((err: any) => {
        if (err.message) {
          res.status(422).send({
            message: err.message,
          });
        } else {
          res.status(500).send({
            message: "Some error occurred while creating the job.",
          });
        }
      });
  },

  findAll: async (req: Request, res: Response, next: NextFunction) => {
    JobModel.find()
      .then((job: any) => {
        res.send(job);
      })
      .catch((err: any) => {
        res.status(500).send({
          message: err.message || "Some error occurred while retrieving jobs.",
        });
      });
  },

  findOne: async (req: Request, res: Response, next: NextFunction) => {
    JobModel.findById(req.params.id)
      .then((job: any) => {
        if (!job) {
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }
        // can the current user accept this job
        const currentUserId = req.body.userId;

        job = job.toObject();
        const labellers = Object.values(job.labellers);
        let isLabeller = false;
        for (let labeller of labellers) {
          if (labeller == currentUserId) {
            isLabeller = true;
            break;
          }
        }
        job.canAccept =
          !isLabeller &&
          job.labellers.length < job.numLabellersRequired &&
          job.author != currentUserId;

        res.send(job);
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }
        return res.status(500).send({
          message: "Error retrieving job with id " + req.params.id,
        });
      });
  },

  // find available jobs - jobs that aren't mine and I haven't accepted
  // need user id
  findAvailable: async (req: Request, res: Response, next: NextFunction) => {
    const userObjectId = new Mongoose.Types.ObjectId(req.body.userId);

    // find all jobs where user is not the author
    // AND where user is not labeller
    JobModel.find({
      author: { $ne: userObjectId },
      labellers: { $ne: userObjectId },
      // $expr: { $lt: ["$labellers.length", "$numLabellersRequired"] }, // first < second
    })
      .then((jobs: any) => {
        res.json(jobs);
      })
      .catch((err: any) => {
        return res.status(400).json({ error: "Something went wrong" });
      });
  },

  // find my job - jobs that I uploaded
  // need user id
  findAuthored: async (req: Request, res: Response, next: NextFunction) => {
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

  // find accepted jobs - jobs that aren't mine and I have accepted
  // need user id
  findAccepted: async (req: Request, res: Response, next: NextFunction) => {
    const userObjectId = new Mongoose.Types.ObjectId(req.body.userId);

    // find all jobs where user is in labellers
    JobModel.find({
      labellers: userObjectId,
    })
      .then((jobs: any) => {
        res.json(jobs);
      })
      .catch((err: any) => {
        return res.status(400).json({ error: "Something went wrong" });
      });
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
      return res.status(400).send({
        message: "Job content can not be empty",
      });
    }

    JobModel.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .then((job: any) => {
        if (!job) {
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }
        res.send(job);
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }
        return res.status(500).send({
          message: "Error updating job with id " + req.params.id,
        });
      });
  },

  addLabeller: async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
      return res.status(400).send({
        message: "Data not recieved correctly",
      });
    }

    JobModel.findByIdAndUpdate(
      req.params.id,
      { $push: { labellers: req.body.userId } },
      { new: true }
    )
      .then((job: any) => {
        if (!job) {
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }
        // return successful update - 204 means no body (not required for PUT)
        res.status(204).send();
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }
        return res.status(500).send({
          message: "Error updating job with id " + req.params.id,
        });
      });
  },

  delete: async (req: Request, res: Response, next: NextFunction) => {
    JobModel.findByIdAndRemove(req.params.id)
      .then((job: any) => {
        if (!job) {
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }
        res.status(204).send();
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId" || err.name === "NotFound") {
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }
        return res.status(500).send({
          message: "Could not delete job with id " + req.params.id,
        });
      });
  },

  // updateItemAggregation: async (
  //   jobId: Mongoose.Types.ObjectId,
  //   itemId: Mongoose.Types.ObjectId
  // ) => {
  //   // check length of current aggregation list
  //   // if it is less than our threshold, add the item, otherwise continue
  //   JobModel.findById(jobId)
  //     .then((job: any) => {
  //       if (!job) {
  //         // job isn't found
  //         return Promise.reject();
  //       }
  //       // check the lenth of aggregate items
  //       // console.log(job.aggregate_items.length);
  //       if (job.aggregate_items.length < numItemsAggregated) {
  //         // add the new item to the aggregate list
  //         JobModel.findByIdAndUpdate(
  //           jobId,
  //           { $push: { aggregate_items: itemId } },
  //           { new: true }
  //         ).then((res: any) => {
  //           // any logic after aggregate list is updated goes here
  //           return Promise.resolve();
  //         });
  //       } else {
  //         return Promise.resolve();
  //       }
  //     })
  //     .catch((err: any) => {
  //       return Promise.reject(err);
  //     });
  // },
};

export default JobController;
