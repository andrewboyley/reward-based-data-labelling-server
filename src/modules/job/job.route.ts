import JobController from "./job.controller";
import express from "express";
const VerifyToken = require("../auth/VerifyToken");

// set up a router
const router = express.Router();

router.get("/", JobController.findAll);
router.get("/available", VerifyToken, JobController.findAvailable); // get jobs available to this user
router.get("/authored", VerifyToken, JobController.findAuthored); // get jobs that user authored
router.get("/accepted", VerifyToken, JobController.findAccepted); // get jobs that user accepted
router.get("/:id", VerifyToken, JobController.findOne);

router.post("/", VerifyToken, JobController.create); // create a job

router.put("/:id", JobController.update);
router.put("/labeller/:id", VerifyToken, JobController.addLabeller); // id is the job id

router.delete("/:id", JobController.delete); // remove the job with that id

module.exports = router;
