var jwt = require("jsonwebtoken");
import { Express, Request, Response, NextFunction } from "express";

function verifyToken(req: Request, res: Response, next: NextFunction) {
  // take in a request, and translate token to id
  var token;
  try {
    // retrieve the token from the header
    token = req.headers["authorization"];

    // check the token was actually provided
    if (!token) return res.status(403).send({ message: "No token provided." });

    // get the actual actual token - remove "bearer"
    token = token.split(" ")[1];
  } catch (err: any) {
    // catch any token errors
    return res.status(422).send({ message: "Malformed token header" });
  }

  // confirm that the retrieved token is actually valid
  jwt.verify(token, process.env.SECRET, function (err: any, decoded: any) {
    if (err)
      // invalid token
      return res.status(401).send({ message: "Failed to authenticate token." });

    // if everything good, save to request for use in other routes
    req.body.userId = decoded.id;
    next();
  });
}

module.exports = verifyToken;
