import BatchController from "./batch.controller";
import express from "express";
const VerifyToken = require("../auth/VerifyToken");

const router = express.Router();
router.get("/", BatchController.findAll);
router.get("/next/:job", VerifyToken, BatchController.findNext); // return the next batch available number
router.get("/expiry/:id", VerifyToken, BatchController.findLabellerExpiry); // get a user's expiry for a particular batch with id
router.get("/:id", VerifyToken, BatchController.findOneComplete); // get a particular batch with id

//router.get("/", VerifyToken,BatchController.findProgress);

router.put("/labeller/:batch", VerifyToken, BatchController.addLabeller); //Adds the labeller to the batch, batch is the batchID
router.put("/complete/:batch", VerifyToken, BatchController.finishJob); // marks the batch completed for the user, batch is the batchID

router.delete("/labeller/:batch", VerifyToken, BatchController.removeLabeller); // The user 'gives up' labelling this batch, batch is the batchID

module.exports = router;
