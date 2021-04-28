import mongoose, { Schema } from "mongoose";

// get schema
const schema: any = mongoose.Schema;

// create user schema
const JobSchema: any = new schema({
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
  },
  items: [
    {
      type: Schema.Types.ObjectId,
      ref: "LabelledItem",
      required: [true, "Labelled items not provided"],
    },
  ],
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Author not provided"],
  },
});

// create model
// name = model. Generally use capital letter
// params = (collectionName - automatically pluralise, schema)}
const Job = mongoose.model("Job", JobSchema);

// make available to other files
export default Job;
