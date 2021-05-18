import { Express, Request, Response, NextFunction } from "express";
import User from "../user/user.model";
import { CallbackError } from "mongoose";
import hash from "../../hash";
var jwt = require("jsonwebtoken");

process.env.SECRET = process.env.SECRET || "deletthislol";

let AuthController = {
  // check if email exists
  register: async (req: Request, res: Response, next: NextFunction) => {
    User.exists(
      { email: req.body.email },
      function (err: CallbackError, exists: boolean) {
        if (exists) {
          // if it does exist, send an error
          res.status(422).json({ error: "This user has already been created" });
        } else {
          // hash the password
          hash.hashPassword(req.body.password, (hash: string) => {
            req.body.password = hash;

            // shortcut - does new, save together
            // return Promise
            User.create(req.body)
              .then((user: any) => {
                // return the user
                // remove the password field
                user = user.toObject();
                delete user.password;

                var token = jwt.sign({ id: user._id }, process.env.SECRET, {
                  expiresIn: 1800, // expires in 24 hours
                });

                res.status(201).json({ user: user, token: token });
              })
              .catch((err) => {
                res.status(500).send(err.message);
              }); // move onto next middleware
          });
        }
      }
    );
  },

  getID: async (req: any, res: Response, next: NextFunction) => {
    User.findById(req.userId, (err: any, user: any) => {
      if (err)
        return res.status(500).send("There was a problem finding the user.");
      if (!user) return res.status(404).send("No user found.");

      res.status(200).send({ id: req.userId });
    });
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    User.findOne({ email: req.body.email }, function (err: any, user: any) {
      if (err) return res.status(500).send(err.message);
      if (!user) return res.status(404).send("No user found.");

      hash.comparePassword(
        req.body.password,
        user.password,
        (isValid: boolean) => {
          if (isValid) {
            // the password is correct - return user object sans password
            delete user.password;

            var token = jwt.sign({ id: user._id }, process.env.SECRET, {
              expiresIn: 1800, // expires in 24 hours
            });

            res.status(200).json({ user: user, token: token });
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
