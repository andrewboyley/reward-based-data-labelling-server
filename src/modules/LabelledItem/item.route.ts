
import multer from "multer";
import express, {Express} from "express";
import { CallbackError } from "mongoose";
import LabelledItemModel from "./item.model"
 

// set up multer for storing uploaded files

var storage = multer.diskStorage({
	destination: (req: Express.Request, file:Express.Multer.File, cb)=>{
		console.log(__dirname);
		cb(null, __dirname+'../../../uploads/jobs/pictures');
	},
	filename: (req: Express.Request, file: Express.Multer.File, cb)=>{
		console.log(file);
		cb(null, file.originalname + '-' + Date.now())
	}
})

var upload = multer({ storage: storage });
// load the mongoose model


const router = express.Router();

const baseUrl = "/images";

// the GET request handler that provides the HTML UI

router.get(baseUrl, (req, res) => {
	var message = {
		message: "success"
	}
	// labelledItemModel.find({}, (err:CallbackError, items:any) => {
	// 		if (err) {
	// 				console.log(err);
	// 				res.status(500).send(err);
	// 		}
	// 		else {
	// 				res.status(200).send(message);
	// 		}
	// });
});

router.post(baseUrl +'/upload', upload.single('image'), (req, res, next) => {
	var obj = {
		label: "",
		value: "../uploads/jobs/pictures"
	}
	console.log(req);
	LabelledItemModel.create(obj, (err:CallbackError, item:any) => {
			if (err) {
					console.log(err);
			}
			else {
					// item.save();
					console.log("success");
					res.status(200);
			}
	});
});

module.exports = router;
