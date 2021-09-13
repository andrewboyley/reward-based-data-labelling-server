import express from "express";
import { CallbackError } from "mongoose";
import User from "./user.model";
import hash from "../../hash";

// set up a router
const router = express.Router();

// make the router available to other files
module.exports = router;
