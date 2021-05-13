import express, { Express, Request } from "express";
import AuthController from "./auth.controller";

var router = express.Router();

router.post("/register", AuthController.register);
router.get("/id", AuthController.getID);
router.get("/login", AuthController.login);

module.exports = router;
