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
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author not provided"],
    },

    labellers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      }
    ]
    //Uses the labelledItem to embed images for the summary of the job

    // summary_images: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "LabelledItem",
    //     required: [false, "No images uploaded"]
    //   },
    // ]
  },
  { versionKey: false }
);

// create model
// name = model. Generally use capital letter
// params = (collectionName - automatically pluralise, schema)}
var JobModel = mongoose.model("Job", JobSchema);

export default JobModel;
