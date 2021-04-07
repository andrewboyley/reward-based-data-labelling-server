import express from "express";
import User from "../models/user";

// todo add db functionality - need User model

// set up a router
const router = express.Router();

// define the base enpoint for all requests to users
const baseUrl = "/user";

// todo validate email
function validateEmail(email: String): Boolean {
  return email.includes("@");
}

// get list of users from db
// todo GET user
router.get(
  baseUrl + "/:id",
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.send({ type: `GET user ${req.params.id}` });
  }
);

// insert a new user
// todo POST user
// todo check valid
router.post(
  baseUrl,
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // validate email
    const validEmail: Boolean = validateEmail(req.body.email);

    // shortcut - does new, save together
    // return Promise
    User.create(req.body)
      .then((user: any) => {
        // return the ninja
        res.send(user);
      })
      .catch(next); // move onto next middleware
  }
);

// update user
// todo PUT user
router.put(
  baseUrl + "/:id",
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.send({ type: `PUT user ${req.params.id}` });
  }
);

// delete user
// todo DELETE user
router.delete(
  baseUrl + "/:id",
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.send({ type: `DELETE user ${req.params.id}` });
  }
);

// make the router available to other files
module.exports = router;
