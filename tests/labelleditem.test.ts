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
  // connect to in-memory db
  var jobID: string;
  before(async function () {
    await dbHandler.connect();
  });
  const userInsert: any = {
    firstName: "Some",
    surname: "One",
    email: "someone@example.com",
    password: "someHash",
  };

  // empty mongod before each test (so no conflicts)
  beforeEach(async function () {
    var userID: string;

    await dbHandler.clear();
    let res: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/user/")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(userInsert);

    userID = res.body._id;

    const jobInsert: any = {
      title: "A second job",
      description: "Another job description",
      author: userID,
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
    };

    res = await chai
      .request(server)
      .post("/api/job/")
      .set("Content-Type", "application/json; charset=utf-8")
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
