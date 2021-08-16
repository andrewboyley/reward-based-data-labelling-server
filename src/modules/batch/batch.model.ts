import mongoose, { Schema } from "mongoose";
const AutoIncrement = require('mongoose-sequence')(mongoose);
// create user schema
const BatchSchema: any = new Schema(
	{
		// the batch number, will be an auto-increment
		index: Number,

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

BatchSchema.plugin(AutoIncrement, { inc_field: 'index' });
var BatchModel = mongoose.model("Batch", BatchSchema);
export default BatchModel;