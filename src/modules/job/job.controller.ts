var mongoose = require("mongoose");
import { Request, Response, NextFunction } from "express";
import JobModel from "./job.model"

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
