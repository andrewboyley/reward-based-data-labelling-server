import { Request, Response, NextFunction } from "express";
import Mongoose, { Schema } from "mongoose";
import JobModel from "../job/job.model";
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

	create: async (batchNumber: number, jobID: Mongoose.Types.ObjectId) => {
		BatchModel.create({ batch_number: batchNumber, job: jobID }).then(
			(batch: any) => { }
		);
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
					message:
						err.message || "Some error occurred while retrieving batches.",
				});
			});
	},

	determineAvailableBatches: async (
		userId: Mongoose.Types.ObjectId,
		jobId: Mongoose.Types.ObjectId,
		numLabellersRequired: number
	) => {
		// find all batches in this job that:
		// 1) we have not labelled before
		// 2) can still be labelled
		const batches: any = await BatchModel.find({
			job: jobId, // get batches in the desired job
			"labellers.labeller": { $ne: userId }, // satisfies (1)
		}).$where("this.labellers.length < " + numLabellersRequired); // satisfies (2)

		if (batches === null) {
			// something went wrong, return null
			return null;
		} else {
			// all these batches are available to us still
			// return a valid batch, or an empty obj
			return batches.length === 0 ? {} : batches[0];
		}
	},

	findNext: async (req: Request, res: Response, next: NextFunction) => {
		// return the next batch, if it exists
		// else return empty obj

		// userID is in the request (has passed through VerifyToken)
		// jobID is in the req.params

		// extract the user id from the request
		const userObjectId = new Mongoose.Types.ObjectId(req.body.userId);

		// get this job
		const job: any = await JobModel.findById(req.params.job);
		if (job === null)
			return res.status(404).json({ error: "Job does not exist" });

		// check that we did not author this job happened in previous request
		// only time a call will be made directly here is when have already done a batch in this job

		// determine available batches for this job
		const batches = await BatchController.determineAvailableBatches(
			userObjectId,
			job._id,
			job.numLabellersRequired
		);

		if (batches !== null) {
			// nothing went wrong
			res.status(200).json(batches);
		} else {
			// something went wrong
			return res.status(400).json({ error: "Something went wrong" });
		}
	},

	addLabeller: async (req: Request, res: Response, next: NextFunction) => {
		// check that a labeller has been provided
		if (!req.body) {
			return res.status(400).send({
				message: "Data not receive correctly",
			});
		}

		// add the labeller to the job's batch
		BatchModel.findByIdAndUpdate(
			req.params.batch,
			{ $push: { labellers: { labeller: req.body.userId } } },
			{ new: true }
		)
			.then((batch: any) => {
				if (!batch) {
					// invalid batch id was provided
					return res.status(404).send({
						message: "Batch not found with id " + req.params.batch,
					});
				}
				// return successful update - 204 means no body (not required for PUT)
				res.status(204).send();
			})
			.catch((err: any) => {
				if (err.kind === "ObjectId") {
					// something was wrong with the job id
					return res.status(404).send({
						message: "Batch not found with id " + req.params.batch,
					});
				}

				// something else went wrong
				return res.status(500).send({
					message: "Error updating batch with id " + req.params.batch,
				});
			});
	},
};

export default BatchController;
