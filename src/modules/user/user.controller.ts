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
  getLeaderboard: async (req: Request, res: Response, next: NextFunction) => {
    User.find({}).sort({ 'rewardCount': -1 }).limit(10).select({ "firstName": 1, "surname": 1, "_id": 0, "rewardCount": 1 }).exec(function (err, posts) {
      if (err) {
        return res.status(500).json({
          message: err,
        });
      }

      return res.status(200).json(posts);
    })
  }
};

export default UserController;
