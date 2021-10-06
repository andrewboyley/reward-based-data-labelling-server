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

  labels: [
    {
      labeller: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Labeller not provided"],
      },
      value: [
        {
          // the labels assigned to this data item by this labeller
          type: String,
          default: "not_labelled",
          required: [true, "Label value not provided"],
        },
      ],
    },
  ],

  // is the actual data value
  // for images, path to image
  value: {
    type: String,
    required: [true, "Value not provided"],
  },

  batchNumber: {
    type: Number,
    default: -1,
  },
});

// create model
// name = model. Generally use capital letter
// params = (collectionName - automatically pluralise, schema)}
const LabelledItem = mongoose.model("LabelledItem", LabelledItemModel);

// make available to other files
export default LabelledItem;
