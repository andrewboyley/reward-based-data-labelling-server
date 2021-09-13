import express from "express";
import dbHandler from "./db-handler";
import cors from "cors";

if (process.env.NODE_ENV !== "production") {
	require("dotenv").config();
}

// use environment port number if it exists - used for listening for requests
const port: string = process.env.port || "4000";

// set up express app
const app: any = express();

// set up database (if test env, will do in each test)
if (process.env.NODE_ENV !== "test") dbHandler.connect();

// middleware - allow cross origin requests (from frontend)
app.use(cors());

// set up express static
app.use("/uploads", express.static("uploads"));

// set up middleware to parse body
app.use(express.json());

// use the routes defined in /src/modules
// "/api" is a prefix
const apiPrefix = "/api";
var indexRouter = express.Router();
indexRouter.use("/user", require("./modules/user/user.route"));
indexRouter.use("/job", require("./modules/job/job.route"));
indexRouter.use("/images", require("./modules/LabelledItem/item.route"));
indexRouter.use("/auth", require("./modules/auth/auth.route"));
indexRouter.use("/batch", require("./modules/batch/batch.route"));
//indexRouter.use("/job", require("./modules/LabelledItem/item.route"));

app.use("/api", indexRouter);

// listen for requests (listen on port)
// export to allow testing
export default app.listen(port, () => {
	console.log(`Listening for requests on ${port}`);
});
