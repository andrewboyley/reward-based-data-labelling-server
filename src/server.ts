import express from "express";
import dbHandler from "./db-handler";

// use environment port number if it exists - used for listening for requests
const port: string = process.env.port || "4000";

// set up express app
const app: any = express();

// set up database (if test env, will do in each test)
if (process.env.NODE_ENV !== "test") dbHandler.connect();

// set up middleware to parse body
app.use(express.json());

// use the routes defined in /src/routes
// "/api" is a prefix
app.use("/api", require("./routes/user"));

// error handling middleware
app.use(function (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  res.status(422).send({ error: err.message });
});

// listen for requests (listen on port)
// export to allow testing
export default app.listen(port, () => {
  console.log(`Listening for requests on ${port}`);
});
