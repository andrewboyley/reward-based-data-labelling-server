import { Express, Request, Response, NextFunction } from "express";
import Mongoose from "mongoose";
import { countCompletedJobsForUser } from "../job/job.controller";
import User from "./user.model";

async function determineUserRating(
  userId: Mongoose.Types.ObjectId
): Promise<number> {
  const user: any = await User.findById(userId);

  if (!user) return -1;

  let rating: number = user.rating;
  rating /= await countCompletedJobsForUser(userId);

  return rating;
}

let UserController = {
  findOne: async (req: Request, res: Response, next: NextFunction) => {
    User.findById(req.body.userId)
      .then((user: any) => {
        // don't need this check - VerifyToken will throw an error if something goes wrong
        // if (!user) {
        //   return res.status(404).json({
        //     message: "User not found",
        //   });
        // }

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
    User.find({})
      .sort({ rewardCount: -1 })
      .limit(10)
      .select({ firstName: 1, surname: 1, _id: 0, rewardCount: 1 })
      .exec(function (err, posts) {
        if (err) {
          return res.status(500).json({
            message: err,
          });
        }

        return res.status(200).json(posts);
      });
  },

  findRating: async (req: Request, res: Response, next: NextFunction) => {
    // use the user id to get the stored rating
    // divide this by a call to determine the number of compelted jobs this user has taken part in
    determineUserRating(req.body.userId).then((rating: number) => {
      if (rating < 0) {
        return res.status(500).send({
          message: "An error occurred trying to calculate the user's rating",
        });
      } else {
        res.status(200).json({ rating: rating });
      }
    });
  },

};

export default UserController;
export {determineUserRating};

