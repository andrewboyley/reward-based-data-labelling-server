import express from "express";
import { CallbackError } from "mongoose";
import User from "../models/user.model";

// set up a router
const router = express.Router();

// define the base enpoint for all requests to users
const baseUrl = "/user";

// check if user exists - if yes, return user object
// HAS to come BEFORE the next get request - /login will match both, but :id will only match second one and bypass this one
router.get(
  baseUrl + "/login",
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // check that the required data values are present
    const requiredFields: string[] = ["email", "password"];

    const query = req.query;

    // build an error message if required fields are missing
    let errorMessage: string = "Missing the following field(s): ";
    let missingFields: boolean = false;
    for (let field of requiredFields) {
      if (query.hasOwnProperty(field) === false) {
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

    // Access the provided 'email' and 'password' query parameters
    const email = req.query.email;
    const password = req.query.password;

    // Check if user exists
    User.exists(
      { email: email, password: password },
      function (err: CallbackError, exists: boolean) {
        if (exists) {
          // if it does exist, send back user object
          User.findOne(
            { email: email, password: password },
            function (err: CallbackError, user: any) {
              // return the user
              // remove the password field
              if (err !== null) {
                res.status(400).json({ error: "An error occurred" });
              } else {
                user = user.toObject();
                delete user.password;
                res.status(200).json(user);
              }
            }
          );
        } else {
          // doesn't exist - return error
          res.status(401).json({ error: "Login credentials invalid" });
        }
      }
    );
  }
);

// get list of users from db
// todo GET user
router.get(
  baseUrl + "/:id",
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.send({ type: `GET user ${req.params.id}` });
  }
);

// insert a new user
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
              // return the user
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
