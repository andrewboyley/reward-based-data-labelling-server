import express, { Express, Request } from "express";
import AuthController from "./auth.controller";
var VerifyToken = require("./VerifyToken");

var router = express.Router();

router.post("/register", AuthController.register);
router.get("/id", VerifyToken, AuthController.getID);
router.post("/login", AuthController.login);

module.exports = router;
