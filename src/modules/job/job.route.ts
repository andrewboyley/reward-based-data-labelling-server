import JobController from "./job.controller";
import express from "express";

// set up a router
const router = express.Router();

router.get("/", JobController.findAll);
router.get("/:id", JobController.findOne);
router.get("/available/:id", JobController.findAvailable); // get jobs available to this user
router.get("/authored/:id", JobController.findAuthored); // get jobs that user authored
router.get("/accepted/:id", JobController.findAccepted); // get jobs that user accepted
router.post("/", JobController.create);
router.put("/:id", JobController.update);
router.put("/labeller/:id", JobController.addLabeller);

router.delete("/:id", JobController.delete);

module.exports = router;
