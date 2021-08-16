import BatchController from "./batch.controller";
import express from "express";


const router = express.Router();
router.get("/", BatchController.findAll);
router.post("/", BatchController.create);

module.exports = router;