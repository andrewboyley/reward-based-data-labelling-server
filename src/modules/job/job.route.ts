import JobController from "./job.controller";
import express from "express";

// set up a router
const router = express.Router();

router.get("/", JobController.findAll);
router.get("/:id", JobController.findOne);
router.post("/", JobController.create);
router.put("/:id", JobController.update);
router.delete("/:id", JobController.delete);

module.exports = router;
