import express from "express";

// use environment port number if it exists - used for listening for requests
const port: any = process.env.port || 4000;

// set up express app
const app: any = express();

// set up database
// todo ---- start
import mongoose from "mongoose";
mongoose.connect("mongodb://localhost/jinx", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.Promise = global.Promise;
// todo ---- end

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
  // console.log(err)
  res.status(422).send({ error: err.message });
});

// listen for requests (listen on port)
// export to allow testing
export default app.listen(port, () => {
  console.log(`listening for requests on ${port}`);
});
