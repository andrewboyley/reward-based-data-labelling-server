import express, { Express, Request } from "express";
import AuthController from "./auth.controller";
var VerifyToken = require("./VerifyToken");

var router = express.Router();

router.post("/register", AuthController.register); // create a new user
router.get("/id", VerifyToken, AuthController.getID); // translate a user token to a user id
router.post("/login", AuthController.login); // authenticate a user

module.exports = router;
