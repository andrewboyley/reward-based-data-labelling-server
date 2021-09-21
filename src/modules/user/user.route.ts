import express from "express";
import UserController from "./user.controller";
const VerifyToken = require("../auth/VerifyToken");

// set up a router
const router = express.Router();

router.get("/", VerifyToken, UserController.findOne);

// make the router available to other files
module.exports = router;
