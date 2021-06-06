// process.env.NODE_ENV = "test";

// import fs - test image uploads
import fs from "fs";
import path from "path";

import chai from "chai";
import chaiHttp from "chai-http";
import rimraf from "rimraf";
import dbHandler from "../src/db-handler";
import server from "../src/server";

const expect = chai.expect;

chai.use(chaiHttp);

describe("POST /images - upload image", () => {
  const endpoint = "/api/images";

  // keep track of job and user
  let jobID: string;
  let userToken: string;

  // dummy user
  const userInsert: any = {
    firstName: "Some",
    surname: "One",
    email: "someone@example.com",
    password: "someHash",
  };

  // connect to in-memory db
  before(async function () {
    await dbHandler.connect();
  });

  // empty mongod before each test (so no conflicts)
  beforeEach(async function () {
    await dbHandler.clear();

    // create user
    let res: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(userInsert);

    // get the user token
    userToken = res.body.token;

    const jobInsert: any = {
      title: "A second job",
      description: "Another job description",
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
    };

    res = await chai
      .request(server)
      .post("/api/job/")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(jobInsert);

    jobID = res.body._id;
  });

  // disconnect from in-memory db
  after(async function () {
    await dbHandler.close();
  });

  it("save image in uploads folder", (done: any) => {
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "multipart/form-data")
      .field("jobID", jobID)
      .attach("image", "tests/test_image/test.png")
      .end(function (err: any, res: ChaiHttp.Response) {
        expect(err).to.be.null;
        expect(res.status).to.equal(200);
        rimraf("uploads/jobs/" + jobID, function () {
          console.log("Removed test image");
        });
        done();
      });
  });
});
