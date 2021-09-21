import { Express, Request, Response, NextFunction } from "express";
import Mongoose from "mongoose";
import User from "./user.model";

let UserController = {
  findOne: async (req: Request, res: Response, next: NextFunction) => {
    User.findById(req.body.userId)
      .then((user: any) => {
        if (!user) {
          return res.status(404).json({
            message: "User not found",
          });
        }

        res.status(200).json(user);
      })
      .catch((err: any) => {
        // some other error occurred
        return res.status(500).send({
          message: "Error retrieving user",
        });
      });
  },
};

export default UserController;
