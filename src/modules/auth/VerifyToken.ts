var jwt = require("jsonwebtoken");
import { Express, Request, Response, NextFunction } from "express";


//TODO: figure out what to do with the req:any
function verifyToken(req: any, res: Response, next: NextFunction) {
  var token = req.headers["x-access-token"];
  if (!token) return res.status(403).send({ message: "No token provided." });

  jwt.verify(token, process.env.SECRET, function (err: any, decoded: any) {
    if (err)
      return res
        .status(500)
        .send({message: "Failed to authenticate token." });

    // if everything good, save to request for use in other routes
    req.userId = decoded.id;
    next();
  });
}

module.exports = verifyToken;
