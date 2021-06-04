import express from "express";
import { CallbackError } from "mongoose";
import User from "./user.model";
import hash from "../../hash";

// set up a router
const router = express.Router();

// get list of users from db
// todo GET user
router.get(
  "/:id",
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.send({ type: `GET user ${req.params.id}` });
  }
);

// update user
// todo PUT user
router.put(
  "/:id",
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.send({ type: `PUT user ${req.params.id}` });
  }
);

// delete user
// todo DELETE user
router.delete(
  "/:id",
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.send({ type: `DELETE user ${req.params.id}` });
  }
);

// make the router available to other files
module.exports = router;
