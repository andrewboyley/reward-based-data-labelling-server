import mongoose, { Schema } from "mongoose";

// get schema
const schema: any = mongoose.Schema;

// create user schema
const LabelledItemModel: any = new schema({
  // need to define attributes
  job: {
    // id of the job to which this data item belongs
    type: Schema.Types.ObjectId,
    ref: "Job",
  },

  // todo - change this to an array so can assign multiple labels to the image
  label: {
    // the label assigned to this data item
    type: String,
    default: "not_labelled",
  },

  // is the actual data value
  // for images, path to image
  value: {
    type: String,
    required: [true, "Value not provided"],
  },
});

// create model
// name = model. Generally use capital letter
// params = (collectionName - automatically pluralise, schema)}
const LabelledItem = mongoose.model("LabelledItem", LabelledItemModel);

// make available to other files
export default LabelledItem;
