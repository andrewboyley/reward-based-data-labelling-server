import JobController from "./job.controller";
import express from "express";
const VerifyToken = require("../auth/VerifyToken");

// set up a router
const router = express.Router();

router.get("/", JobController.findAll);
router.get("/available", VerifyToken, JobController.findAvailable); // get jobs available to this user
router.get("/authored", VerifyToken, JobController.findAuthored); // get jobs that user authored
router.get("/accepted", VerifyToken, JobController.findAccepted); // get jobs that user accepted
router.get("/completed", VerifyToken, JobController.findCompleted); // get jobs that user completed
router.get("/labelled/:id", VerifyToken, JobController.findJobLabels); // get a complete job, with the labels as well
router.get("/ratings/:id", VerifyToken, JobController.findAvgLabelRatings); // get the average rating for each image, in that job
router.get("/export/:id", VerifyToken, JobController.exportJob); // export the job with id, with labels, to a csv file
router.get("/:id", VerifyToken, JobController.findOne);

router.post("/", VerifyToken, JobController.create); // create a job

router.put("/:id", VerifyToken, JobController.update);
router.put("/labeller/:id", VerifyToken, JobController.addLabeller); // id is the job id

router.delete("/:id", VerifyToken, JobController.delete); // remove the job with that id

module.exports = router;
