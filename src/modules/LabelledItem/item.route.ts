
import multer from "multer";
import express, {Express, Request} from "express";
import { CallbackError, Mongoose } from "mongoose";
import LabelledItemModel from "./item.model"
import JobModel from "../job/job.model";
import { nanoid } from 'nanoid'


// set up multer for storing uploaded files

var storage = multer.diskStorage({
	destination: (req: Request, file:Express.Multer.File, cb)=>{
		cb(null, 'uploads/jobs/');
	},
	filename: (req: Request, file: Express.Multer.File, cb)=>{
		var filename: string = "";
		if(file.mimetype == "image/jpeg"){
			filename = nanoid(36) + '.jpg';
		}else if(file.mimetype == "image/png"){
			filename = nanoid(36) + '.png';
		}
		cb(null, filename);
	}
})

var upload = multer({ storage: storage });
// load the mongoose model


const router = express.Router();


router.post('/', upload.array('image'), (req: Request, res, next) => {
	// get job Id from request body
	var jobID = req.body.jobID;

	// gets file uploaded from request and create new labelled item object
	var newLabelledItemObject;
	
	for (var i = 0; i < req.files.length; i++ ){
		// creates the new labelled item json object
		newLabelledItemObject = {
			value : (req.files as Express.Multer.File[])[i].filename,
			job: jobID
		}
	
		// create a mongoose labelled item object
		let newLabelledItem = new LabelledItemModel(newLabelledItemObject);

		// save the labelled item in the database
		newLabelledItem
			.save()
			.then((data: any) => {

				// // once the item is saved, save the reference of the item to the corresponding job
				// 	JobModel.findById(jobID)
				// .then((job: any) => {
					
				// 	if (!job) {
				// 		return res.status(404).send({
				// 			message: "Job not found with id " + req.params.id,
				// 		});
				// 	}
				// 	job.items.push(data._id);
				// 	job.save();

				// })
				// .catch((err: any) => {
				// 	if (err.kind === "ObjectId") {
				// 		return res.status(404).send({
				// 			message: "Job not found with id " + req.params.id,
				// 		});
				// 	}
				// 	return res.status(500).send({
				// 		message: "Error retrieving job with id " + req.params.id,
				// 	});
				// });
				res.status(200).send(data);
			})
			.catch((err: any) => {
				console.log(err.message);
				res.status(500).send({
					message: err.message || "Some error occurred while creating the job.",
				});
			});
	};


});

module.exports = router;
