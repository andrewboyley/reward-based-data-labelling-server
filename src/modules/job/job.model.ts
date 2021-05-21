import mongoose, { Schema } from "mongoose";
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
    labels: {
      type: Array,
      required: [true, "Label(s) required"],
      default: ["a", "b", "c"]
    },
    rewards:{
      type: Number,
      required: [true, "Reward amount required"],
      default: 1
    }
  },
  { versionKey: false }
);

// create model
// name = model. Generally use capital letter
// params = (collectionName - automatically pluralise, schema)}
var JobModel = mongoose.model("Job", JobSchema);

export default JobModel;
