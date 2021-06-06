import { Express, Request, Response, NextFunction } from "express";
import User from "../user/user.model";
import { CallbackError } from "mongoose";
import hash from "../../hash";
var jwt = require("jsonwebtoken");

process.env.SECRET = process.env.SECRET || "deletthislol";

let AuthController = {
  // check if email exists
  register: async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.email) {
      return res.status(422).json({ error: "Email not provided" });
    }
    User.exists(
      { email: req.body.email },
      function (err: any, exists: boolean) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (exists) {
          // if it does exist, send an error
          return res
            .status(422)
            .json({ error: "This user has already been created" });
        } else {
          // hash the password
          if (!req.body.password) {
            return res.status(422).json({ error: "Password not provided" });
          }
          hash.hashPassword(req.body.password, (hash: string) => {
            if (err) {
              res.status(500).json({ error: err.message });
            }
            req.body.password = hash;

            // shortcut - does new, save together
            // return Promise
            User.create(req.body)
              .then((user: any) => {
                // return the user
                // remove the password field
                user = user.toObject();
                delete user.password;
                delete user.__v;

                var token = jwt.sign({ id: user._id }, process.env.SECRET, {
                  expiresIn: 1800, // expires in 30 min
                });
                delete user._id;
                user.token = token;
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

  getID: async (req: Request, res: Response, next: NextFunction) => {
    User.findById(req.body.userId, (err: any, user: any) => {
      if (err)
        return res.status(500).send("There was a problem finding the user.");
      if (!user) return res.status(404).send("No user found.");

      res.status(200).send({ id: req.body.userId });
    });
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.email) {
      return res.status(422).json({ error: "Email not provided" });
    }
    User.findOne({ email: req.body.email }, function (err: any, user: any) {
      if (err) return res.status(500).json({ error: err.message });
      if (!user)
        return res.status(401).json({ error: "Login credentials invalid" });

      if (!req.body.password) {
        return res.status(422).json({ error: "Password not provided" });
      }
      hash.comparePassword(
        req.body.password,
        user.password,
        (isValid: boolean) => {
          if (isValid) {
            user = user.toObject();
            // the password is correct - return user object sans password
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
