import mongoose, { Schema } from "mongoose";

// get schema
const schema: any = mongoose.Schema;

// create user schema
const UserSchema: any = new schema({
  // need to define attributes
  // first name(s)
  firstName: {
    type: String,
    required: [true, "First Name not provided"], // error message if not provided
  },
  // surname
  surname: {
    type: String,
    required: [true, "Surname not provided"],
  },
  // email address, acts as identifier
  email: {
    type: String,
    required: [true, "Email not provided"],
    unique: [true, "Email already is use"],
  },
  // user password, hashed using bcrypt
  password: {
    type: String,
    required: [true, "Password not provided"],
  },
  // relative (to "/") file path to image
  profilePicturePath: {
    type: String,
    default: "generic.jpeg", // use a generic image if one is not provided
  },
});

// create model
// name = model. Generally use capital letter
// params = (collectionName - automatically pluralise, schema)}
const User = mongoose.model("User", UserSchema);

// make available to other files
export default User;
