import multer from "multer";
import fs from "fs";
import express, { Express, Request } from "express";
import LabelledItem from "./item.controller";
import { nanoid } from "nanoid";
const VerifyToken = require("../auth/VerifyToken");

// set up multer for storing uploaded files

var storage = multer.diskStorage({
  // define where to store the image
  destination: (req: Request, file: Express.Multer.File, cb) => {
    // specify the directory to use/create
    let fileDirectory = "uploads/jobs/" + req.body.jobID;

    // create the directory if it doesn't already exist
    if (!fs.existsSync(fileDirectory)) {
      fs.mkdirSync(fileDirectory);
    }

    // move to the next stage of the storage process
    cb(null, fileDirectory);
  },

  // determine the image's filename
  filename: (req: Request, file: Express.Multer.File, cb) => {
    var filename: string = "";

    // generate a random, unique name for this file, and assign it an appropriate extension
    if (file.mimetype == "image/jpeg") {
      filename = nanoid(36) + ".jpg";
    } else if (file.mimetype == "image/png") {
      filename = nanoid(36) + ".png";
    }

    // move on to the next stage
    cb(null, filename);
  },
});

var upload = multer({ storage: storage });
// load the mongoose model

const router = express.Router();

router.get("/", LabelledItem.findAll); // return all data corresponding to a job id (in body)
router.post("/", VerifyToken, upload.array("image"), LabelledItem.addItem); // save an image and add it to the relevant collections

router.put("/:labelid", VerifyToken, LabelledItem.updateLabel);

module.exports = router;
