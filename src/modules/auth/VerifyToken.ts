var jwt = require("jsonwebtoken");
import { Express, Request, Response, NextFunction } from "express";

function verifyToken(req: Request, res: Response, next: NextFunction) {
  var token;
  try {
    token = req.headers["authorization"];
    if (!token) return res.status(403).send({ message: "No token provided." });
    token = token.split(" ")[1];
  } catch (err: any) {
    return res.status(422).send({ message: "Malformed token header" });
  }

  jwt.verify(token, process.env.SECRET, function (err: any, decoded: any) {
    if (err)
      return res.status(500).send({ message: "Failed to authenticate token." });

    // if everything good, save to request for use in other routes
    req.body.userId = decoded.id;
    next();
  });
}

module.exports = verifyToken;
