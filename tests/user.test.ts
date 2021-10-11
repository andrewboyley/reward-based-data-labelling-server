import chai, { expect } from "chai";
import spies from "chai-spies";
import chaiHttp from "chai-http";
import rimraf from "rimraf";
import Mongoose from "mongoose";

import dbHandler from "../src/db-handler";
import UserController, {
  determineUserRating,
} from "../src/modules/user/user.controller";
import server from "../src/server";

chai.use(chaiHttp);
chai.use(spies);

describe("GET /user", () => {
  const endpoint = "/api/user/";

  // dummy data
  let userToken = "";

  let dummyJobId: any;
  let mockJob: any;

  const user: any = {
    firstName: "Some",
    surname: "One",
    email: "someone@example.com",
    password: "someHash",
  };

  // dummy job insert
  let dataInsert: any = {
    title: "Some title",
    description: "Some description",
    //date created does not need to be inserted because it is not changable by user
    // author: "Replaced in a bit",
    numLabellersRequired: 2,
    labels: ["A"],
    reward: 1,
    labellers: [],
  };

  before(async function () {
    await dbHandler.connect();
  });

  beforeEach(async function () {
    await dbHandler.clear();

    // create a dummy user
    let res: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(user);

    // get the user token
    userToken = res.body.token;

    dataInsert = {
      title: "Some title",
      description: "Some description",
      //date created does not need to be inserted because it is not changable by user
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
      labellers: [],
    };

    // create this job to create the batches
    res = await chai
      .request(server)
      .post("/api/job")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(dataInsert);

    dummyJobId = res.body._id;
    mockJob = res.body;

    await chai
      .request(server)
      .post("/api/images")
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", dummyJobId)
      .attach("image", "tests/test_image/png.png");
  });
  // disconnect from in-memory db
  after(async function () {
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
    await dbHandler.close();
  });

  afterEach(async () => {
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
  });

  it("finds a user", (done: any) => {
    chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res: any) => {
        expect(res).to.have.status(200);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res.body).to.have.property("_id");
        expect(res.body).to.have.property("rewardCount");
        expect(res.body).to.have.property("firstName");
        expect(res.body).to.have.property("surname");
        expect(res.body).to.have.property("email");
        // todo - remove this in the response
        // expect(res.body).to.not.have.property("password");

        done();
      })
      .catch(done);
  });

  it("returns the leaderboard", (done: any) => {
    chai
      .request(server)
      .get(endpoint + "/leaderboard")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res: any) => {
        expect(res).to.have.status(200);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        const body = res.body[0];
        expect(body).to.have.property("rewardCount", 0); // no jobs labelled yet
        expect(body).to.have.property("firstName", user["firstName"]);
        expect(body).to.have.property("surname", user["surname"]);

        done();
      })
      .catch(done);
  });
});

describe("GET /rating", () => {
  const endpoint = "/api/user/";

  // dummy data
  let userToken = "";

  let dummyJobId: any;
  let mockJob: any;
  let imageId: string;

  const user: any = {
    firstName: "Some",
    surname: "One",
    email: "someone@example.com",
    password: "someHash",
  };

  // dummy job insert
  let dataInsert: any = {
    title: "Some title",
    description: "Some description",
    //date created does not need to be inserted because it is not changable by user
    // author: "Replaced in a bit",
    numLabellersRequired: 2,
    labels: ["A"],
    reward: 1,
    labellers: [],
  };

  before(async function () {
    await dbHandler.connect();
  });

  beforeEach(async function () {
    await dbHandler.clear();

    // create a dummy user
    let res: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(user);

    // get the user token
    userToken = res.body.token;

    dataInsert = {
      title: "Some title",
      description: "Some description",
      //date created does not need to be inserted because it is not changable by user
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
      labellers: [],
    };

    // create this job to create the batches
    res = await chai
      .request(server)
      .post("/api/job")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(dataInsert);

    dummyJobId = res.body._id;
    mockJob = res.body;

    await chai
      .request(server)
      .post("/api/images")
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", dummyJobId)
      .attach("image", "tests/test_image/png.png");

    // get the image id we have just uploaded
    res = await chai
      .request(server)
      .get("/api/images")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .query({ jobID: dummyJobId });

    imageId = res.body[0]._id;
  });
  // disconnect from in-memory db
  after(async function () {
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
    await dbHandler.close();
  });

  afterEach(async () => {
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
  });

  it("gets the user rating - successul", (done: any) => {
    chai
      .request(server)
      .get(endpoint + "/rating")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res: any) => {
        expect(res).to.have.status(200);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res.body).to.have.property("rating");

        done();
      })
      .catch(done);
  });

  it("gets the user rating - wrong user id", (done: any) => {
    // set up determineUserRating spy
    // create mock request response and next objects
    const mockReq: any = {
      body: {
        userId: String,
      },
    };

    const mockRes: any = {
      status: (statusCode: number) => {
        return mockRes;
      },
      send: () => {},
    };
    const next = () => {};

    // spy on the functions inside the dummy response object
    const spy = chai.spy.on(mockRes, "status");

    // get the user id
    let userId: string;
    let batchID: string;

    chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res: any) => {
        userId = res.body.id;

        //  get the batch id
        return chai
          .request(server)
          .get("/api/batch/")
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((batches: any) => {
        batchID = batches.body[0]._id;

        // accept the batch
        return chai
          .request(server)
          .put("/api/batch/labeller/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // label the batch
        const labels = ["one"];

        const data: any = { labels: labels };

        return chai
          .request(server)
          .put("/api/images/" + imageId) // label this image
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken)
          .send(data);
      })
      .then((res: any) => {
        // complete the batch
        return chai
          .request(server)
          .put("/api/batch/complete/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then(async (res: any) => {
        // verify that the rating is correct
        mockReq.body.userId = "f" + userId.slice(1);
        return await UserController.findRating(mockReq, mockRes, next);
      })
      .then((res: any) => {
        expect(spy).to.have.been.called.with(500);
        done();
      })
      .catch(done);
  });
});

describe("User utilities", () => {
  const endpoint = "/api/user/";

  // dummy data
  let userToken = "";

  let dummyJobId: any;
  let mockJob: any;
  let imageId: string;

  const user: any = {
    firstName: "Some",
    surname: "One",
    email: "someone@example.com",
    password: "someHash",
  };

  // dummy job insert
  let dataInsert: any;

  before(async function () {
    await dbHandler.connect();
  });

  beforeEach(async function () {
    await dbHandler.clear();

    // create a dummy user
    let res: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(user);

    // get the user token
    userToken = res.body.token;

    dataInsert = {
      title: "Some title",
      description: "Some description",
      //date created does not need to be inserted because it is not changable by user
      numLabellersRequired: 1,
      labels: ["A"],
      reward: 1,
      labellers: [],
    };

    // create this job to create the batches
    res = await chai
      .request(server)
      .post("/api/job")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(dataInsert);

    dummyJobId = res.body._id;
    mockJob = res.body;

    res = await chai
      .request(server)
      .post("/api/images")
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", dummyJobId)
      .attach("image", "tests/test_image/png.png");

    // get the image id we have just uploaded
    res = await chai
      .request(server)
      .get("/api/images")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .query({ jobID: dummyJobId });

    imageId = res.body[0]._id;
  });
  // disconnect from in-memory db
  after(async function () {
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
    await dbHandler.close();
  });

  afterEach(async () => {
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
  });

  it("determines the user rating - successful", (done: any) => {
    // get the user id
    let userId: string;
    let batchID: string;

    chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res: any) => {
        userId = res.body.id;

        //  get the batch id
        return chai
          .request(server)
          .get("/api/batch/")
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((batches: any) => {
        batchID = batches.body[0]._id;

        // accept the batch
        return chai
          .request(server)
          .put("/api/batch/labeller/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // label the batch
        const labels = ["one"];

        const data: any = { labels: labels };

        return chai
          .request(server)
          .put("/api/images/" + imageId) // label this image
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken)
          .send(data);
      })
      .then((res: any) => {
        // complete the batch
        return chai
          .request(server)
          .put("/api/batch/complete/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // verify that the rating is correct
        return determineUserRating(Mongoose.Types.ObjectId(userId));
      })
      .then((rating: number) => {
        expect(rating).to.equal(1);
        done();
      })
      .catch(done);
  });

  it("determines the user rating - wrong user id", (done: any) => {
    // get the user id
    let userId: string;
    let batchID: string;

    chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res: any) => {
        userId = res.body.id;

        //  get the batch id
        return chai
          .request(server)
          .get("/api/batch/")
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((batches: any) => {
        batchID = batches.body[0]._id;

        // accept the batch
        return chai
          .request(server)
          .put("/api/batch/labeller/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // label the batch
        const labels = ["one"];

        const data: any = { labels: labels };

        return chai
          .request(server)
          .put("/api/images/" + imageId) // label this image
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken)
          .send(data);
      })
      .then((res: any) => {
        // complete the batch
        return chai
          .request(server)
          .put("/api/batch/complete/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // verify that the rating is correct
        return determineUserRating(
          Mongoose.Types.ObjectId("f" + userId.slice(1))
        );
      })
      .then((rating: number) => {
        expect(rating).to.equal(-1);
        done();
      })
      .catch(done);
  });

  it("determines the user rating - no completed jobs", (done: any) => {
    // get the user id
    let userId: string;
    let batchID: string;

    chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res: any) => {
        userId = res.body.id;

        //  get the batch id
        return chai
          .request(server)
          .get("/api/batch/")
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((batches: any) => {
        batchID = batches.body[0]._id;

        // accept the batch
        return chai
          .request(server)
          .put("/api/batch/labeller/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // verify that the rating is correct
        return determineUserRating(Mongoose.Types.ObjectId(userId));
      })
      .then((rating: number) => {
        expect(rating).to.equal(0);
        done();
      })
      .catch(done);
  });
});
