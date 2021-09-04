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

    // create a dummy job
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
    rimraf.sync(__dirname + "/../uploads/jobs/" + jobID);
    await dbHandler.close();
  });

  it("save png image in uploads folder", (done: any) => {
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", jobID)
      .attach("image", "tests/test_image/png.png")
      .end(function (err: any, res: ChaiHttp.Response) {
        // check that the image has been uploaded
        expect(err).to.be.null;
        expect(res.status).to.equal(200);
        rimraf.sync(__dirname + "/../uploads/jobs/" + jobID);
        done();
      });
  });

  it("save jpg image in uploads folder", (done: any) => {
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", jobID)
      .attach("image", "tests/test_image/jpg.jpg")
      .end(function (err: any, res: ChaiHttp.Response) {
        // check the image has been uploaded
        expect(err).to.be.null;
        expect(res.status).to.equal(200);
        rimraf.sync(__dirname + "/../uploads/jobs/" + jobID);

        done();
      });
  });
});

describe("GET /images - find images", () => {
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
    rimraf.sync(__dirname + "/../uploads/jobs/" + jobID);

    await dbHandler.close();
  });

  it("retrieves all job images", (done: any) => {
    // upload image
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", jobID)
      .attach("image", "tests/test_image/png.png")
      .end(function (err: any, res: ChaiHttp.Response) {
        // retrieve image
        chai
          .request(server)
          .get(endpoint)
          .set("Content-Type", "application/json; charset=utf-8")
          .query({ jobID: jobID })
          .end((err: any, res: ChaiHttp.Response) => {
            // verify have image
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body).to.have.lengthOf(1);
            const body = res.body[0];
            expect(body).to.have.property("_id");
            expect(body).to.have.property("labels");
            expect(body).to.have.property("value");
            expect(body["value"]).to.not.equal("");
            expect(body).to.have.property("job", jobID);

            // remove test image
            rimraf("uploads/jobs/" + jobID, function () {
              console.log("Removed test image");
            });
            done();
          });
      });
  });
});
