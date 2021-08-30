import BatchController from "./batch.controller";
import express from "express";
const VerifyToken = require("../auth/VerifyToken");

const router = express.Router();
router.get("/", BatchController.findAll);
router.get("/next/:job", VerifyToken, BatchController.findNext); // return the next batch available number
router.get("/:id", BatchController.findOneComplete); // get a particular batch with id

router.put("/labeller/:batch", VerifyToken, BatchController.addLabeller); //Adds the labeller to the batch, batch is the batchID

router.delete("/labeller/:batch", VerifyToken, BatchController.removeLabeller); // The user 'gives up' labelling this batch, batch is the batchID

module.exports = router;
