import mongoose, { Schema } from "mongoose";

// get schema
const schema: any = mongoose.Schema;

// create user schema
const LabelledItemModel: any = new schema({
  // need to define attributes
	job:{
		type:Schema.Types.ObjectId,
		ref:"Job"
	},
  label: {
    type: String,
		default: "not_labelled"
  },
  //For images, path to image
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