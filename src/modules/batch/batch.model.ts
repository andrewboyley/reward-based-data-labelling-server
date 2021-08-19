import mongoose, { Schema } from "mongoose";
// create user schema
const BatchSchema: any = new Schema({
  // the batch number, will be an auto-increment
  batch_number: Number,

  // job the batch belongs to
  job: {
    type: Schema.Types.ObjectId,
    ref: "Job",
  },

<<<<<<< HEAD
		// labellers: {
		// 	type: Array,
		// 	default: []
		// }
	//	alternative implementation
		// people who have accepted the batch, and their completion status

		labellers: [
			{
				labeller: {
					type: Schema.Types.ObjectId,
					ref: "User",
				},

				completed: {
					type: Boolean,
					default: false,
				},
			},
		],

	},
);
=======
  // people who have accepted the batch, and their completion status
  labellers: [
    {
      labeller: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      completed: {
        type: Boolean,
        default: false,
      },
    },
  ],
});
>>>>>>> 36136ce05e15df04f2cbc74f1cc3eac60159414b

var BatchModel = mongoose.model("Batch", BatchSchema);
export default BatchModel;
