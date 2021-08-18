import mongoose, { Schema } from "mongoose";
// create user schema
const BatchSchema: any = new Schema(
	{
		// the batch number, will be an auto-increment
		batch_number: Number,

		// job the batch belongs to
		job: {
			type: Schema.Types.ObjectId,
			ref: "Job",
		},

		// people who have accepted the batch, and their completion status
		labellers: {
			type: Array,
			default: []
		}
		// alternative implementation
		// labellers: [
		// 	{
		// 		labeller: {
		// 			type: Schema.Types.ObjectId,
		// 			ref: "User",
		// 		},

		// 		status: {
		// 			type: Boolean,
		// 		},
		// 	},
		// ],

	},
);

var BatchModel = mongoose.model("Batch", BatchSchema);
export default BatchModel;