import mongoose, { Schema } from "mongoose";
import LabelledItem from "../LabelledItem/item.model";

// create user schema
const JobSchema: any = new Schema(
  {
    // need to define attributes
    title: {
      type: String,
      required: [true, "Title not provided"],
    },
    description: {
      type: String,
      required: [true, "Description not provided"],
    },
    dateCreated: {
      type: Date,
      default: Date.now,
    },
    author: {
      // id of the user who created the job
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author not provided"],
    },
    labels: {
      // list of possible labels which can be used to label data
      type: Array,
      required: [true, "Label(s) required"],
      default: ["a", "b", "c"],
    },
    rewards: {
      // total reward available for this job - it will be split between labellers
      type: Number,
      required: [true, "Reward amount required"],
      default: 1,
    },

    // labellers: [
    //   // list of the users who accepted the job
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "User",
    //   },
    // ],
    //Handled in batches now

    numLabellersRequired: {
      // max num of users who can accept the job
      type: Number,
      required: [true, "Number of labellers not provided"],
      default: 5,
    },

    //Uses the labelledItem to embed images for the summary of the job
    aggregate_items: [
      {
        type: Schema.Types.ObjectId,
        ref: "LabelledItem",
        required: [false, "No images uploaded"],
      },
    ],

    total_batches: {
      type: Number,
      default: 1,
    }
  },

  { versionKey: false }
);

// create model
// name = model. Generally use capital letter
// params = (collectionName - automatically pluralise, schema)}
var JobModel = mongoose.model("Job", JobSchema);

export default JobModel;
