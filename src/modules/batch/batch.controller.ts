import { Request, Response, NextFunction } from "express";
import Mongoose, { Schema } from "mongoose";
import BatchModel from "./batch.model";

let BatchController = {
	create: async (req: Request, res: Response, next: NextFunction) => {
		let newBatch = new BatchModel(req.body);
		newBatch.save().then((data: any) => {
			res.status(201).send(data);
		}).catch((err: any) => {
			if (err.message) {
				res.status(422).send({
					message: err.message,
				});
			} else {
				res.status(500).send({
					message: "Something went wrong while creating the batch."
				})
			}
		})
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
}

export default BatchController;
