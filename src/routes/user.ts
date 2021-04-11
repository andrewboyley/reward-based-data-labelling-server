import express from "express";
import { CallbackError } from "mongoose";
import User from "../models/user";

// set up a router
const router = express.Router();

// define the base enpoint for all requests to users
const baseUrl = "/user";

// get list of users from db
// todo GET user
router.get(
  baseUrl + "/:id",
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.send({ type: `GET user ${req.params.id}` });
  }
);

// todo GET user login
router.get(baseUrl + "/login/", () => {
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Access the provided 'email' and 'password' query parameters
    const email = req.query.email;
    const password = req.query.password;
    console.log(email, password);
    res.send({ type: `GET user ${req.query.email}` });
  };
});

// insert a new user
// todo POST user
// todo check valid
router.post(
  baseUrl,
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // check that the required data values are present
    const requiredFields: string[] = [
      "firstName",
      "surname",
      "email",
      "password",
    ];

    const body = req.body;

    // build an error message if required fields are missing
    let errorMessage: string = "Missing the following field(s): ";
    let missingFields: boolean = false;
    for (let field of requiredFields) {
      if (body.hasOwnProperty(field) === false) {
        missingFields = true;
        errorMessage += field + ", ";
      }
    }

    // if required fields are missing, then return an error
    if (missingFields) {
      errorMessage = errorMessage.slice(0, -2);
      res.status(422).json({ error: errorMessage });
      return;
    }

    // check if email exists
    User.exists(
      { email: body.email },
      function (err: CallbackError, exists: boolean) {
        if (exists) {
          // if it does exist, send an error
          res.status(422).json({ error: "This user has already been created" });
        } else {
          // shortcut - does new, save together
          // return Promise
          User.create(body)
            .then((user: any) => {
              // return the ninja
              // remove the password field
              user = user.toObject();
              delete user.password;
              res.status(201).send(user);
            })
            .catch(next); // move onto next middleware
        }
      }
    );
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
