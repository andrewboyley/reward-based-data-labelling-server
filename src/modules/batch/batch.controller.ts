import { Request, Response, NextFunction } from "express";
import Mongoose, { Schema } from "mongoose";
import BatchModel from "./batch.model";

let BatchController = {
	// create: async (req: Request, res: Response, next: NextFunction) => {
	// 	let newBatch = new BatchModel(req.body);
	// 	newBatch.save().then((data: any) => {
	// 		res.status(201).send(data);
	// 	}).catch((err: any) => {
	// 		if (err.message) {
	// 			res.status(422).send({
	// 				message: err.message,
	// 			});
	// 		} else {
	// 			res.status(500).send({
	// 				message: "Something went wrong while creating the batch."
	// 			})
	// 		}
	// 	})
	// },

	create: async (batchNumber: number, jobID: Mongoose.Types.ObjectId) =>{
		BatchModel.create({batch_number: batchNumber, job: jobID}).then((batch: any) =>{
		}
	)
	},


	findAll: async (req: Request, res: Response, next: NextFunction) => {
		// return all the jobs
		BatchModel.find()
			.then((batch: any) => {
				res.send(batch);
			})
			.catch((err: any) => {
				// some error occurred
				res.status(500).send({
					message: err.message || "Some error occurred while retrieving batches.",
				});
			});
	},

	addLabeller: async (req: Request, res: Response, next: NextFunction) => {
		// check that a labeller has been provided
		if (!req.body) {
		  return res.status(400).send({
			message: "Data not recieved correctly",
		  });
		}
	
		// add the labeller to the job
		BatchModel.findByIdAndUpdate(
		  req.params.id,
		  { $push: { labellers: req.body.userId } },
		  { new: true }
		)
		  .then((job: any) => {
			if (!job) {
			  // invalid job id was provided
			  return res.status(404).send({
				message: "Job not found with id " + req.params.id,
			  });
			}
			// return successful update - 204 means no body (not required for PUT)
			res.status(204).send();
		  })
		  .catch((err: any) => {
			if (err.kind === "ObjectId") {
			  // something was wrong with the job id
			  return res.status(404).send({
				message: "Job not found with id " + req.params.id,
			  });
			}
	
			// something else went wrong
			return res.status(500).send({
			  message: "Error updating job with id " + req.params.id,
			});
		  });
	  },
}

export default BatchController;
