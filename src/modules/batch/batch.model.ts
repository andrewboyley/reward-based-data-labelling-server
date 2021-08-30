import mongoose, { Schema } from "mongoose";

// time limit in milliseconds
// const timeLimitMilliseconds = 24 * 60 * 60 * 1000; // 24 hours
const timeLimitMilliseconds = 2 * 1000;

// create user schema
const BatchSchema: any = new Schema({
  // the batch number, will be an auto-increment
  batch_number: Number,

  // job the batch belongs to
  job: {
    type: Schema.Types.ObjectId,
    ref: "Job",
  },

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

      expiry: {
        type: Date,
        default: function () {
          // set the expiry time to a period in the future
          let date = new Date();
          date.setTime(date.getTime() + timeLimitMilliseconds);
          return date;
        },
      },
    },
  ],
});

var BatchModel = mongoose.model("Batch", BatchSchema);
export default BatchModel;
