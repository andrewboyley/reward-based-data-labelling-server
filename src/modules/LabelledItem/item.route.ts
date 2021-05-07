import multer from "multer";
import express, { Request } from "express";
import LabelledItem from "./item.controller";
import { nanoid } from "nanoid";

// set up multer for storing uploaded files

var storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, "uploads/jobs/");
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

router.post("/", upload.array("image"), LabelledItem.addItem);

module.exports = router;
