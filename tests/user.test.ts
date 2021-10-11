import chai, { expect } from "chai";
import chaiHttp from "chai-http";
import rimraf from "rimraf";

import dbHandler from "../src/db-handler";
import server from "../src/server";

chai.use(chaiHttp);

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

  it("gets rating", (done: any) => {
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

 

 
});