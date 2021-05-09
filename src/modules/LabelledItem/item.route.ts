import multer from "multer";
import fs from 'fs';
import express, {Express, Request } from "express";
import LabelledItem from "./item.controller";
import { nanoid } from "nanoid";

// set up multer for storing uploaded files

var storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
		let fileDirectory ="uploads/jobs/"+req.body.jobID; 
		if(!fs.existsSync(fileDirectory)){
			fs.mkdirSync(fileDirectory);
		}
    cb(null, fileDirectory);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    var filename: string = "";
    if (file.mimetype == "image/jpeg") {
      filename = nanoid(36) + ".jpg";
    } else if (file.mimetype == "image/png") {
      filename = nanoid(36) + ".png";
    }
    cb(null, filename);
  },
});

var upload = multer({ storage: storage });
// load the mongoose model

const router = express.Router();

router.get("/", LabelledItem.findAll);
router.post("/", upload.array("image"), LabelledItem.addItem);

module.exports = router;
