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
      .then((job: any) => {
        if (!job) {
          // the job with that id doesn't exist
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

        // the user can accept the job if he didn't create it, hasn't accepted it and there are still slots available
        job.canAccept =
          !isLabeller &&
          job.labellers.length < job.numLabellersRequired &&
          job.author != currentUserId;

        // return the job
        res.send(job);
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
    // AND where user is not labeller
    // AND where there are still labelling slots available
    JobModel.find({
      author: { $ne: userObjectId },
      labellers: { $ne: userObjectId },
    })
      .$where("this.labellers.length < this.numLabellersRequired")
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

  // find accepted jobs - jobs that aren't mine and I have accepted
  // need user id
  findAccepted: async (req: Request, res: Response, next: NextFunction) => {
    // extract the user id from the request
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
    // check that a labeller has been provided
    if (!req.body) {
      return res.status(400).send({
        message: "Data not recieved correctly",
      });
    }

    // add the labeller to the job
    JobModel.findByIdAndUpdate(
      req.params.id,
      { $push: { labellers: req.body.userId } },
      { new: true }
    )
      .then((job: any) => {
        if (!job) {
          // invalid job id was provided
          return res.status(404).send({
            message: "Job not found with id " + req.params.id,
          });
        }
        // return successful update - 204 means no body (not required for PUT)
        res.status(204).send();
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
