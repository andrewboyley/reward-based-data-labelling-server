import { Request, Response, NextFunction } from "express";
import Mongoose, { Schema } from "mongoose";
import JobModel from "./job.model";

let JobController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    // Validate request
    if (!req.body) {
      return res.status(400).send({
        message: "Job content can not be empty",
      });
    }

    let newJob = new JobModel(req.body);

    newJob
      .save()
      .then((data: any) => {
        res.send(data);
      })
      .catch((err: any) => {
        res.status(500).send({
          message: err.message || "Some error occurred while creating the job.",
        });
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
    const userObjectId = new Mongoose.Types.ObjectId(req.params.id);

    // find all jobs where user is not the author
    // AND where user is not labeller
    JobModel.find({
      author: { $ne: userObjectId },
      labellers: { $ne: userObjectId },
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
    const userObjectId = new Mongoose.Types.ObjectId(req.params.id);

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
    const userObjectId = new Mongoose.Types.ObjectId(req.params.id);

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
      { $push: { labellers: req.body.user } },
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
        res.send({ message: "Job deleted successfully!" });
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
};

export default JobController;
