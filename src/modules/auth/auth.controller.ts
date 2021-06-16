import { Express, Request, Response, NextFunction } from "express";
import User from "../user/user.model";
import { CallbackError } from "mongoose";
import hash from "../../hash";
var jwt = require("jsonwebtoken");

process.env.SECRET = process.env.SECRET || "deletthislol";

let AuthController = {
  // register a new user
  register: async (req: Request, res: Response, next: NextFunction) => {
    // ensure that an email is provided - this will be used to uniquely identify a user
    if (!req.body.email) {
      return res.status(422).json({ error: "Email not provided" });
    }

    // check that the email hasn't been used for another user - will invalidate user management later
    User.exists(
      { email: req.body.email },
      function (err: any, exists: boolean) {
        if (err) {
          // catch any error that may have occurred
          return res.status(500).json({ error: err.message });
        }
        if (exists) {
          // if it does exist, send an error
          return res
            .status(422)
            .json({ error: "This user has already been created" });
        } else {
          // ensure that a password has been provided
          if (!req.body.password) {
            return res.status(422).json({ error: "Password not provided" });
          }

          // hash the user's password
          hash.hashPassword(req.body.password, (hash: string) => {
            if (err) {
              // catch any hashing errors
              res.status(500).json({ error: err.message });
            }

            // overwrite the plaintext password with the hash
            req.body.password = hash;

            // shortcut - does new, save together
            // return Promise
            User.create(req.body)
              .then((user: any) => {
                // return the user
                // remove the password field - shouldn't be visible at all
                user = user.toObject();
                delete user.password;
                delete user.__v;

                // sign a JWT so the user will be authenticated for the near future
                var token = jwt.sign({ id: user._id }, process.env.SECRET, {
                  expiresIn: 1800, // expires in 30 min
                });

                // we will use the token to identify the user - prevents security circumvention
                delete user._id;
                user.token = token;

                // return the user
                res.status(201).json(user);
              })
              .catch((err) => {
                res.status(422).send({ error: err.message });
              }); // move onto next middleware
          });
        }
      }
    );
  },

  // translate JWT to the user id
  getID: async (req: Request, res: Response, next: NextFunction) => {
    // will have been passed through middleware that decodes any token attached

    // check the decoded id actually corresponds to a user
    User.findById(req.body.userId, (err: any, user: any) => {
      if (err)
        // the user doesn't exist
        return res.status(500).send("There was a problem finding the user.");
      if (!user) return res.status(404).send({ error: "No user found." });

      // return the valid id
      res.status(200).send({ id: req.body.userId });
    });
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    // ensure email was provided - used as the unique identifier
    if (!req.body.email) {
      return res.status(422).json({ error: "Email not provided" });
    }

    // return the user object corresponding to the provided email address
    User.findOne({ email: req.body.email }, function (err: any, user: any) {
      if (err) return res.status(500).json({ error: err.message });
      if (!user)
        // if no user object was returned, the email address is invalid
        return res.status(401).json({ error: "Login credentials invalid" });

      // check a password was provided
      if (!req.body.password) {
        return res.status(422).json({ error: "Password not provided" });
      }

      // hash the provided plaintext password
      // and ensure this hash matches what we have stored - indicates the plaintext password was correct
      hash.comparePassword(
        req.body.password,
        user.password,
        (isValid: boolean) => {
          if (isValid) {
            // the password is correct - return user object sans password
            // return a signed JWT to authenticate the user
            user = user.toObject();
            var token = jwt.sign({ id: user._id }, process.env.SECRET, {
              expiresIn: 1800, // expires in 30 min
            });
            delete user.password;
            delete user.__v;
            delete user._id;
            user.token = token;
            res.status(200).json(user);
          } else {
            // the password is incorrect - return error
            res.status(401).json({ error: "Login credentials invalid" });
          }
        }
      );
    });
  },
};

export default AuthController;
