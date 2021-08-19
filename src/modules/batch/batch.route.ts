import BatchController from "./batch.controller";
import express from "express";
const VerifyToken = require("../auth/VerifyToken");



const router = express.Router();
router.get("/", BatchController.findAll);
router.post("/", BatchController.create);
router.put("/labeller/:id", VerifyToken, BatchController.addLabeller); //Adds the labeller to the batch


module.exports = router;