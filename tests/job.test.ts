import chai from "chai";
import chaiHttp from "chai-http";
import Mongoose from "mongoose";
import rimraf from "rimraf";
import { mock } from "sinon";
import dbHandler from "../src/db-handler";
import {
  checkIfBatchIsAvailable,
  countCompletedJobsForUser,
  isJobCompleted,
} from "../src/modules/job/job.controller";
import server from "../src/server";
const VerifyToken = require("../src/modules/auth/VerifyToken");

const expect = chai.expect;

chai.use(chaiHttp);

describe("GET /job", () => {
  // endpoint
  const endpoint = "/api/job";

  // dummy inserted ids
  let userToken = "";
  let dummyJobId: string;
  let userId: string;
  let imageId: string;
  let imageData: any;

  // dummy user insert
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
  };

  // connect to in-memory db
  before(async function () {
    await dbHandler.connect();
  });

  // empty mongod before each test (so no conflicts)
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

    // get the user id
    res = await chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken);

    userId = res.body.id;

    dataInsert = {
      title: "Some title",
      description: "Some description",
      //date created does not need to be inserted because it is not changable by user
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
    };

    // add a dummy job - no labellers (so have available jobs)
    res = await chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(dataInsert);

    dummyJobId = res.body._id;

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
      .get("/api/images/")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .query({ jobID: dummyJobId });

    imageId = res.body[0]._id;
    imageData = res.body[0];
  });

  afterEach(async function () {
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
  });

  // disconnect from in-memory db
  after(async function () {
    await dbHandler.close();
  });

  /*SAMPLE DATA (correct)
				"items": [],   --------------------------------------------what is an item?
				"_id": "609432f8a1233638d8746b6b",
				"title": "A second job",
				"description": "Another job description",
				"author": "60942b9c1878e068fc0cf954",
		*/

  // successful job retrieval of all jobs - return 200
  it("All jobs retrieved", (done: any) => {
    // returns error code and message
    chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)

        const body = res.body[0];

        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(body).to.have.property("_id");
        expect(body).to.have.property("title", dataInsert["title"]);
        expect(body).to.have.property("description", dataInsert["description"]);
        expect(body).to.have.property("author");
        expect(body).to.have.property("dateCreated");
        expect(body).to.have.property("labels");
        expect(body.labels).deep.equal(dataInsert["labels"]); // compare the elements of the arrays
        done();
      });
  });

  // I don't think there is such a thing as an unsuccessful collection of all of the jobs

  // successful job retrieval of a job by id - return 200
  it("One job retrieved by ID", (done: any) => {
    // returns error code and message

    chai
      .request(server)
      .get(endpoint + "/" + dummyJobId) // craft the correct endpoint
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property("_id");
        expect(res.body).to.have.property("title", dataInsert["title"]);
        expect(res.body).to.have.property(
          "description",
          dataInsert["description"]
        );
        expect(res.body).to.have.property("author");
        expect(res.body).to.have.property("dateCreated");
        expect(res.body).to.have.property("labels");
        expect(res.body.labels).deep.equal(dataInsert["labels"]);
        done();
      });
  });

  // unsuccessful job collection by ID - return 401
  // it would need to not match the ID but I'm not sure how you would retrieve that because it's autogenerated
  it("Job ID not found", (done: any) => {
    // returns error code and message

    // craft incorrect id
    const wrongId = "f" + dummyJobId.slice(1);

    chai
      .request(server)
      .get(endpoint + "/" + wrongId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        // expect id error
        expect(err).to.be.null;
        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongId
        );
        done();
      });
  });

  it("Job ID not valid", (done: any) => {
    // returns error code and message

    // craft incorrect id
    const wrongId = "f" + dummyJobId.slice(1);

    chai
      .request(server)
      .get(endpoint + "/" + wrongId + "f") // make the id malformed
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        // expect id error
        expect(err).to.be.null;
        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongId + "f"
        );
        done();
      });
  });

  it("Retrives all authored jobs", (done: any) => {
    // get all the jobs I made
    chai
      .request(server)
      .get(endpoint + "/authored")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .end((err: any, res: ChaiHttp.Response) => {
        // get my user id
        chai
          .request(server)
          .get("/api/auth/id")
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken)
          .end((err: any, resUser: ChaiHttp.Response) => {
            // check response (and property values where applicable)

            // get the id
            const userId: string = resUser.body.id;

            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res).to.have.header(
              "Content-Type",
              "application/json; charset=utf-8"
            );
            expect(res).to.be.json;

            // check all the returned jobs
            for (let body of res.body) {
              expect(body).to.have.property("_id");
              expect(body).to.have.property("title");
              expect(body).to.have.property("description");
              expect(body).to.have.property("author", userId);
              expect(body).to.have.property("dateCreated");
              expect(body).to.have.property("labels");
            }
            done();
          });
      });
  });

  it("Retrieves all accepted jobs", async () => {
    // get all the jobs I accepted

    // need to create another user and accept as him
    const acceptUser: any = {
      firstName: "Some",
      surname: "One",
      email: "someone1@example.com",
      password: "someHash",
    };

    let response: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(acceptUser);

    // get the user token
    const acceptToken = response.body.token;

    // convert the token to an id
    response = await chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + acceptToken)
      .send();

    const acceptId: string = response.body.id;

    // accept the job as this user
    response = await chai
      .request(server)
      .put(endpoint + "/labeller/" + dummyJobId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + acceptToken)
      .send();

    // check I have accepted the job
    response = await chai
      .request(server)
      .get(endpoint + "/accepted")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + acceptToken)
      .send();

    // check response (and property values where applicable)
    const body = response.body[0];
    // expect(err).to.be.null;
    expect(response).to.have.status(200);
    expect(response).to.have.header(
      "Content-Type",
      "application/json; charset=utf-8"
    );
    expect(response).to.be.json;

    // ensure my id is in the labellers list
    expect(body).to.have.property("_id", dummyJobId);
    expect(body).to.have.property("title");
    expect(body).to.have.property("description");
    expect(body).to.have.property("author");
    expect(body.author).to.not.equal(acceptId);
    expect(body).to.have.property("dateCreated");
    expect(body).to.have.property("labels");
    expect(body).to.have.property("batch_id");

    // get the batch and confirm it is part of this job, with me as a labeller
    response = await chai
      .request(server)
      .get("/api/batch/" + body.batch_id)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + acceptToken)
      .send();

    // confirm this batch is part of this job
    expect(response.body).to.have.property("job", dummyJobId);

    // confirm a labeller exists
    expect(response.body).to.have.property("labellers");

    // check my id is in this property
    expect(response.body.labellers[0]).to.has.property("labeller", acceptId);
  });

  it("Retrieves all available jobs", async () => {
    // get all the jobs I can accept (not mine, not accepted)

    // need to create another user and get available as him
    const availableUser: any = {
      firstName: "Some",
      surname: "One",
      email: "someone1@example.com",
      password: "someHash",
    };

    let response: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(availableUser);

    // get the user token
    const availableToken = response.body.token;

    // convert the token to an id
    response = await chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + availableToken)
      .send();

    const availableId: string = response.body.id;

    response = await chai
      .request(server)
      .get(endpoint + "/available")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + availableToken)
      .send();

    // check response (and property values where applicable)
    const body = response.body[0];
    // expect(err).to.be.null;
    expect(response).to.have.status(200);
    expect(response).to.have.header(
      "Content-Type",
      "application/json; charset=utf-8"
    );
    expect(response).to.be.json;

    // ensure I am not already a labeller on this job, and I am not the author
    expect(body).to.have.property("_id");
    expect(body).to.have.property("title");
    expect(body).to.have.property("description");
    expect(body).to.have.property("author");
    expect(body.author).to.not.equal(availableId);
    expect(body).to.have.property("dateCreated");
    expect(body).to.have.property("labels");

    // get ALL the batches
    response = await chai
      .request(server)
      .get("/api/batch/")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + availableToken)
      .send();

    // make sure there are no labellers
    for (let batchBody of response.body) {
      expect(batchBody).to.have.property("labellers");
      expect(batchBody.labellers).to.deep.equal([]);
    }
  });

  it("Retrieves all completed jobs", async () => {
    const acceptUser: any = {
      firstName: "Some",
      surname: "One",
      email: "someone1@example.com",
      password: "someHash",
    };

    let response: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(acceptUser);

    // get the user token
    const acceptToken = response.body.token;

    // convert the token to an id
    response = await chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + acceptToken)
      .send();

    const acceptId: string = response.body.id;

    // accept the job as this user
    response = await chai
      .request(server)
      .put(endpoint + "/labeller/" + dummyJobId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + acceptToken)
      .send();

    // get the batch for the job
    response = await chai
      .request(server)
      .get("/api/batch/")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + acceptToken)
      .send();
    const batch = response.body[0];

    // complete the batch for the job
    response = await chai
      .request(server)
      .put("/api/batch/complete/" + batch._id)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + acceptToken)
      .send();

    // get the completed jobs
    response = await chai
      .request(server)
      .get(endpoint + "/completed")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + acceptToken)
      .send();

    expect(response.status).to.equal(200);

    expect(response.body[0]._id).to.equal(dummyJobId);
  });

  it("Retrieves the 'assigned' labels for a job - successful", (done: any) => {
    const labels = ["one", "two"];

    // label the image
    chai
      .request(server)
      .put("/api/images/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send({ labels: labels }) // attach payload
      .then((res: ChaiHttp.Response) => {
        // get the job, with the images and labels
        return chai
          .request(server)
          .get(endpoint + "/labelled/" + dummyJobId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken)
          .send();
      })
      .then((res: ChaiHttp.Response) => {
        // ensure the correct job structure is returned

        expect(res).to.have.status(200);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property("_id");
        expect(res.body).to.have.property("title");
        expect(res.body).to.have.property("description");
        expect(res.body).to.have.property("author", userId);
        expect(res.body).to.have.property("dateCreated");
        expect(res.body).to.have.property("labels");
        expect(res.body).to.have.property("rewards");
        expect(res.body).to.have.property("numLabellersRequired");
        expect(res.body).to.have.property("total_batches");
        expect(res.body).to.have.property("images");

        // ensure the images are correctly returned
        expect(res.body.images.length).to.equal(1);
        expect(res.body.images[0]).to.have.property("batchNumber");
        expect(res.body.images[0]).to.have.property("_id");
        expect(res.body.images[0]).to.have.property("value");
        expect(res.body.images[0]).to.have.property("job");
        expect(res.body.images[0]).to.have.property("assignedLabels");
        expect(res.body.images[0].assignedLabels).deep.equal(labels);

        done();
      })
      .catch(done);
  });

  it("Retrieves the 'assigned' labels for a job - job id invalid", (done: any) => {
    const wrongId = dummyJobId + "f";
    // get the job, with the images and labels
    chai
      .request(server)
      .get(endpoint + "/labelled/" + wrongId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send()
      .then((res: ChaiHttp.Response) => {
        // ensure the correct job structure is returned

        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;

        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongId
        );

        done();
      })
      .catch(done);
  });

  it("Retrieves the 'assigned' labels for a job - job id incorrect", (done: any) => {
    const wrongId = dummyJobId.slice(1) + "f";
    // get the job, with the images and labels
    chai
      .request(server)
      .get(endpoint + "/labelled/" + wrongId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send()
      .then((res: ChaiHttp.Response) => {
        // ensure the correct job structure is returned

        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;

        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongId
        );

        done();
      })
      .catch(done);
  });

  it("Retrieves the 'assigned' labels for a job - not author", (done: any) => {
    // get the job, with the images and labels

    // create another user
    chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send({
        firstName: "Some",
        surname: "One",
        email: "someone@example.com1",
        password: "someHash",
      })
      .then((res: ChaiHttp.Response) => {
        // try and get the job as this user
        return chai
          .request(server)
          .get(endpoint + "/labelled/" + dummyJobId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + res.body.token)
          .send();
      })
      .then((res: ChaiHttp.Response) => {
        expect(res).to.have.status(401);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;

        expect(res.body).to.have.property(
          "message",
          "You are not authorised to view this job's labels"
        );

        done();
      })
      .catch(done);
  });

  it("Exports a job - successful", (done: any) => {
    const labels = ["one", "two"];

    // label the image
    chai
      .request(server)
      .put("/api/images/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send({ labels: labels }) // attach payload
      .then((res: ChaiHttp.Response) => {
        // get the job, with the images and labels
        return chai
          .request(server)
          .get(endpoint + "/export/" + dummyJobId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken)
          .send();
      })
      .then((res: ChaiHttp.Response) => {
        // ensure the correct file structure is returned

        expect(res).to.have.status(200);
        expect(res).to.have.header("Content-Type", "text/csv; charset=UTF-8");

        expect(res).to.have.property("text");

        const csvContent = res.text.split("\n");

        expect(csvContent).to.have.length(2);
        expect(csvContent[0]).to.equal(
          "image_filename,original_filename,first_label;second_label;other_labels"
        );
        expect(csvContent[1]).to.equal(
          imageData.value + "," + imageData.originalname + ",one;two"
        );

        done();
      })
      .catch(done);
  });

  it("Exports a job - job id invalid", (done: any) => {
    const labels = ["one", "two"];
    const wrongId = dummyJobId + "f";

    // label the image
    chai
      .request(server)
      .put("/api/images/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send({ labels: labels }) // attach payload
      .then((res: ChaiHttp.Response) => {
        // get the job, with the images and labels
        return chai
          .request(server)
          .get(endpoint + "/export/" + wrongId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken)
          .send();
      })
      .then((res: ChaiHttp.Response) => {
        // ensure the correct file structure is returned

        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );

        expect(res).to.be.json;

        expect(res.body).to.have.property(
          "message",
          "Malformed job id " + wrongId
        );

        done();
      })
      .catch(done);
  });

  it("Exports a job - job id incorrect", (done: any) => {
    const labels = ["one", "two"];
    const wrongId = dummyJobId.slice(1) + "f";

    // label the image
    chai
      .request(server)
      .put("/api/images/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send({ labels: labels }) // attach payload
      .then((res: ChaiHttp.Response) => {
        // get the job, with the images and labels
        return chai
          .request(server)
          .get(endpoint + "/export/" + wrongId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken)
          .send();
      })
      .then((res: ChaiHttp.Response) => {
        // ensure the correct file structure is returned

        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );

        expect(res).to.be.json;

        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongId
        );

        done();
      })
      .catch(done);
  });

  it("Exports a job - not author", (done: any) => {
    // get the job, with the images and labels

    // create another user
    chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send({
        firstName: "Some",
        surname: "One",
        email: "someone@example.com1",
        password: "someHash",
      })
      .then((res: ChaiHttp.Response) => {
        // try and get the job as this user
        return chai
          .request(server)
          .get(endpoint + "/export/" + dummyJobId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + res.body.token)
          .send();
      })
      .then((res: ChaiHttp.Response) => {
        expect(res).to.have.status(401);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;

        expect(res.body).to.have.property(
          "message",
          "You are not authorised to export this job"
        );

        done();
      })
      .catch(done);
  });

  it("finds the average label ratings - successful", (done: any) => {
    // get the batch id
    let batchID: string;

    chai
      .request(server)
      .get("/api/batch/")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
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
        // call the deseried endpoint
        return chai
          .request(server)
          .get("/api/job/ratings/" + dummyJobId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        expect(res).to.have.status(200);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res.body[0]).to.equal(0);
        done();
      })
      .catch(done);
  });

  it("finds the average label ratings - wrong id", (done: any) => {
    // get the batch id
    let batchID: string;
    let wrongID = "f" + dummyJobId.slice(1);

    chai
      .request(server)
      .get("/api/batch/")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
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
        // call the deseried endpoint
        return chai
          .request(server)
          .get("/api/job/ratings/" + wrongID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongID
        );
        done();
      })
      .catch(done);
  });

  it("finds the average label ratings - invalid id", (done: any) => {
    // get the batch id
    let batchID: string;
    let wrongID = "f" + dummyJobId;

    chai
      .request(server)
      .get("/api/batch/")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
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
        // call the deseried endpoint
        return chai
          .request(server)
          .get("/api/job/ratings/" + wrongID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongID
        );
        done();
      })
      .catch(done);
  });
});

describe("POST /job", () => {
  // endpoint
  const endpoint = "/api/job";

  // dummy inserted ids
  let userToken = "";
  let userId = "";

  // dummy user insert
  const user: any = {
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

    // create a dummy user
    let res: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(user);

    // get the user token
    userToken = res.body.token;

    // translate token to id
    res = await chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send();

    userId = res.body.id;
  });

  // disconnect from in-memory db
  after(async function () {
    await dbHandler.close();
  });

  /* SAMPLE DATA (correct)
			{
				"_id": "609432f8a1233638d8746b6b",
				"title": "A second job",
				"description": "Another job description",
				"author": "60942b9c1878e068fc0cf954",
				date created does not need to be inserted because it is not changable by user
				numLabellersRequired: 2,
				labels: ["A"],
				reward: 1,
		};
			}
		*/

  // insert successful
  it("All fields present", (done: any) => {
    // returns job object
    // this case should use the generic image

    const dataInsert: any = {
      title: "A second job",
      description: "Another job description",
      labels: ["A"],
      reward: 1,
      numLabellersRequired: 2,
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(dataInsert)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        expect(err).to.be.null;
        expect(res).to.have.status(201);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property("_id");
        expect(res.body).to.have.property("title", dataInsert["title"]);
        expect(res.body).to.have.property(
          "description",
          dataInsert["description"]
        );
        expect(res.body).to.have.property("author", userId);
        expect(res.body).to.have.property("dateCreated");
        expect(res.body).to.have.property("labels");
        expect(res.body.labels).deep.equal(dataInsert["labels"]);
        done();
      });
  });

  // insert fails - return 422 error
  it("One required field missing", (done: any) => {
    // craft data with one missing field
    const dataInsert: any = {
      // title: "A second job",
      description: "Another job description",
      labels: ["A"],
      reward: 1,
      numLabellersRequired: 2,
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(dataInsert)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response
        // expect data error
        expect(err).to.be.null;
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "message",
          "Job validation failed: title: Title not provided"
        );
        done();
      });
  });

  // insert fails - return 422 error
  it("Multiple required fields missing", (done: any) => {
    // craft data with missing fields
    const dataInsert: any = {
      // title: "A second job",
      // description: "Another job description",
      labels: ["A"],
      reward: 1,
      numLabellersRequired: 2,
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(dataInsert)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response
        // expect data error
        expect(err).to.be.null;
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "message",
          "Job validation failed: description: Description not provided, title: Title not provided"
        );
        done();
      });
  });
});

describe("PUT /job", () => {
  // endpoint
  const endpoint = "/api/job";

  // dummy inserted ids
  let userToken = "";
  let userId = "";
  let dummyJobId: string;
  let mockJob: any;

  // dummy user insert
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
  };

  // connect to in-memory db
  before(async function () {
    await dbHandler.connect();
  });

  // empty mongod before each test (so no conflicts)
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

    // translate to the user id
    res = await chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken);

    userId = res.body.id;

    dataInsert = {
      title: "Some title",
      description: "Some description",
      //date created does not need to be inserted because it is not changable by user
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
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
  });

  afterEach(async function () {
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
  });

  // disconnect from in-memory db
  after(async function () {
    await dbHandler.close();
  });

  it("Updates specific job", (done: any) => {
    // successful

    // field to update
    const newTitle = "New title";

    chai
      .request(server)
      .put(endpoint + "/" + dummyJobId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send({ title: newTitle })
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property("_id");
        expect(res.body).to.have.property("title", newTitle);
        expect(res.body).to.have.property(
          "description",
          dataInsert["description"]
        );
        expect(res.body).to.have.property("author");
        expect(res.body).to.have.property("dateCreated");
        expect(res.body).to.have.property("labels");
        expect(res.body.labels).deep.equal(dataInsert["labels"]);
        done();
      });
  });

  it("Update normal content handles incorrect job id", (done: any) => {
    // returns error code and message

    // craft incorrect id
    const newTitle = "New title";
    const wrongId = "f" + dummyJobId.slice(1);

    chai
      .request(server)
      .put(endpoint + "/" + wrongId) // craft endpoint
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send({ title: newTitle })
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        // expect id error
        expect(err).to.be.null;
        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongId
        );
        done();
      });
  });

  it("Update normal content handles invalid job id", (done: any) => {
    // returns error code and message

    // craft malformed job id
    const newTitle = "New title";
    const wrongId = "f" + dummyJobId;

    chai
      .request(server)
      .put(endpoint + "/" + wrongId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send({ title: newTitle })
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        // expect id error
        expect(err).to.be.null;
        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongId
        );
        done();
      });
  });

  it("Correctly adds a labeller", (done: any) => {
    // ensure labeller is added without error

    chai
      .request(server)
      .put(endpoint + "/labeller/" + dummyJobId) // craft labeller
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("labellers");
        expect(res.body.labellers[0]).to.have.property("labeller", userId);

        done();
      });
  });

  it("Add Labeller handles incorrect job id", (done: any) => {
    // returns error code and message

    // craft updated field and incorrect id
    const newTitle = "New title";
    const wrongId = "f" + dummyJobId.slice(1);

    chai
      .request(server)
      .put(endpoint + "/labeller/" + wrongId) // craft endpoint
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send({ title: newTitle }) // attach updated field
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        // expect id error
        expect(err).to.be.null;
        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongId
        );
        done();
      });
  });

  it("Add Labeller handles invalid job id", (done: any) => {
    // returns error code and message

    // craft updated field and malformed id
    const newTitle = "New title";
    const wrongId = "f" + dummyJobId;

    chai
      .request(server)
      .put(endpoint + "/labeller/" + wrongId) // craft endpoint
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send({ title: newTitle })
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        // expect an if error

        expect(err).to.be.null;
        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongId
        );
        done();
      });
  });
});

describe("DELETE /job", () => {
  // endpoint
  const endpoint = "/api/job";

  // dummy inserted ids
  let userToken = "";
  let dummyJobId: string;

  // dummy user insert
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
    numLabellersRequired: 2,
    labels: ["A"],
    reward: 1,
  };

  // connect to in-memory db
  before(async function () {
    await dbHandler.connect();
  });

  // empty mongod before each test (so no conflicts)
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
    };

    // add a dummy job - no labellers (so have available jobs)
    res = await chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(dataInsert);

    dummyJobId = res.body._id;
  });

  // disconnect from in-memory db
  after(async function () {
    await dbHandler.close();
  });

  it("Deletes a specific job", (done: any) => {
    // returns error code and message

    chai
      .request(server)
      .delete(endpoint + "/" + dummyJobId) // craft correct endpoint
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send()
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        expect(err).to.be.null;
        expect(res).to.have.status(204);
        expect(res.body).deep.equal({});

        // check job doesn't exist still
        chai
          .request(server)
          .get(endpoint)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken)
          .end((err: any, res: ChaiHttp.Response) => {
            // check response (and property values where applicable)

            expect(err).to.be.null;
            expect(res).to.be.json;

            // ensure none of the returned jobs are the one that's just been deleted
            for (let body of res.body) {
              expect(body).to.have.property("_id");
              expect(body["_id"]).to.not.equal(dummyJobId);
            }

            done();
          });
      });
  });

  it("Handles wrong id", (done: any) => {
    // returns error code and message

    // craft incorrect id
    const wrongId = "f" + dummyJobId.slice(1);

    chai
      .request(server)
      .delete(endpoint + "/" + wrongId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send()
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        // expect id error
        expect(err).to.be.null;
        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongId
        );

        done();
      });
  });

  it("Handles invalid id", (done: any) => {
    // returns error code and message

    // craft malformed id (too long)
    const wrongId = "f" + dummyJobId;

    chai
      .request(server)
      .delete(endpoint + "/" + wrongId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send()
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        // expect id error
        expect(err).to.be.null;
        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "message",
          "Job not found with id " + wrongId
        );

        done();
      });
  });
});

describe("Job utility functions", () => {
  const endpoint = "/api/job/";

  // dummy data
  let userToken = "";
  let userId: string;
  let dummyJobId: string;
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

    // get the user id
    // convert the token to an id
    res = await chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send();

    userId = res.body.id;

    dataInsert = {
      title: "Some title",
      description: "Some description",
      //date created does not need to be inserted because it is not changable by user
      numLabellersRequired: 1,
      labels: ["A"],
      reward: 1,
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

    // upload an image to the job we have just created
    res = await chai
      .request(server)
      .post("/api/images")
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", dummyJobId)
      .attach("image", "tests/test_image/png.png");
  });

  // disconnect from in-memory db
  after(async function () {
    await dbHandler.close();
  });

  afterEach(async function () {
    // remove the images we uploaded
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
  });

  it("checks if batch is available - we previously accepted", (done: any) => {
    const extraUser: any = {
      firstName: "Some",
      surname: "One",
      email: "extra@example.com",
      password: "someHash",
    };

    let extraUserToken: string;
    let extraUserId: string;

    // create another user
    chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(extraUser)
      .then((res: ChaiHttp.Response) => {
        // get this user's token
        extraUserToken = res.body.token;

        // get this user's id
        return chai
          .request(server)
          .get("/api/auth/id")
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + extraUserToken);
      })
      .then((res: ChaiHttp.Response) => {
        // extract the user id
        extraUserId = res.body.id;

        // accept the job as this user
        return chai
          .request(server)
          .put(endpoint + "/labeller/" + dummyJobId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + extraUserToken);
      })
      .then((res: ChaiHttp.Response) => {
        // call the function to test
        return checkIfBatchIsAvailable(
          mockJob,
          Mongoose.Types.ObjectId(extraUserId)
        );
      })
      .then((result: boolean) => {
        expect(result).to.equal(false);
        done();
      })
      .catch(done);
  });

  it("checks if batch is available - we have NOT previously accepted", (done: any) => {
    const extraUser: any = {
      firstName: "Some",
      surname: "One",
      email: "extra@example.com",
      password: "someHash",
    };

    let extraUserToken: string;
    let extraUserId: string;

    // create another user
    chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(extraUser)
      .then((res: ChaiHttp.Response) => {
        // get this user's token
        extraUserToken = res.body.token;

        // get this user's id
        return chai
          .request(server)
          .get("/api/auth/id")
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + extraUserToken);
      })
      .then((res: ChaiHttp.Response) => {
        // extract the user id
        extraUserId = res.body.id;

        // call the function to test
        return checkIfBatchIsAvailable(
          mockJob,
          Mongoose.Types.ObjectId(extraUserId)
        );
      })
      .then((result: boolean) => {
        expect(result).to.equal(true);
        done();
      })
      .catch(done);
  });

  it("checks if job is completed - it is", (done: any) => {
    // get the batch id
    let batchID: string;
    chai
      .request(server)
      .get("/api/batch/")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
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
        // complete the batch
        return chai
          .request(server)
          .put("/api/batch/complete/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // verify that the job is completed
        return isJobCompleted(Mongoose.Types.ObjectId(dummyJobId));
      })
      .then((status: boolean) => {
        expect(status).to.be.true;
        done();
      })
      .catch(done);
  });

  it("checks if job is completed - wrong job id", (done: any) => {
    // verify that the job is not completed
    isJobCompleted(Mongoose.Types.ObjectId("f" + dummyJobId.slice(1)))
      .then((status: boolean) => {
        expect(status).to.be.false;
        done();
      })
      .catch(done);
  });

  it("checks if job is completed - no batches are labelled", (done: any) => {
    // verify that the job is not completed
    isJobCompleted(Mongoose.Types.ObjectId(dummyJobId))
      .then((status: boolean) => {
        expect(status).to.be.false;
        done();
      })
      .catch(done);
  });

  it("checks if job is completed - some, not all, batches are labelled", (done: any) => {
    let batchID: string;
    let jobID: string;

    // add a bunch of images until there is a second batch
    const jobData: any = {
      title: "Some title",
      description: "Some description",
      //date created does not need to be inserted because it is not changable by user
      numLabellersRequired: 1,
      labels: ["A"],
      reward: 1,
    };

    // create this job to create the batches
    chai
      .request(server)
      .post("/api/job")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(jobData)
      .then((res: any) => {
        jobID = res.body._id;

        // add the images
        return chai
          .request(server)
          .post("/api/images")
          .set("Content-Type", "multipart/form-data")
          .set("Authorization", "Bearer " + userToken)
          .field("jobID", jobID)
          .attach("image", "tests/test_image/png.png") // 1
          .attach("image", "tests/test_image/png.png") // 2
          .attach("image", "tests/test_image/png.png") // 3
          .attach("image", "tests/test_image/png.png") // 4
          .attach("image", "tests/test_image/png.png") // 5
          .attach("image", "tests/test_image/png.png") // 6
          .attach("image", "tests/test_image/png.png") // 7
          .attach("image", "tests/test_image/png.png") // 8
          .attach("image", "tests/test_image/png.png") // 9
          .attach("image", "tests/test_image/png.png") // 10
          .attach("image", "tests/test_image/png.png") // 11
          .attach("image", "tests/test_image/png.png") // 12
          .attach("image", "tests/test_image/png.png") // 13
          .attach("image", "tests/test_image/png.png") // 14
          .attach("image", "tests/test_image/png.png"); // 15
      })
      .then((res: any) => {
        // get the batch ids

        return chai
          .request(server)
          .get("/api/batch/")
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((batches: any) => {
        // get a batch id for our particular job
        for (let batch of batches.body) {
          if (String(batch.job) === String(jobID)) {
            batchID = batch._id;
          }
        }

        // accept the first batch
        return chai
          .request(server)
          .put("/api/batch/labeller/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
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
        // verify that the job is not completed
        return isJobCompleted(Mongoose.Types.ObjectId(jobID));
      })
      .then((status: boolean) => {
        expect(status).to.be.false;
        done();
      })
      .catch(done);
  });

  it("checks if job is completed - the batch is partially labelled", (done: any) => {
    let batchID: string;
    let jobID: string;

    // add a bunch of images until there is a second batch
    const jobData: any = {
      title: "Some title",
      description: "Some description",
      //date created does not need to be inserted because it is not changable by user
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
    };

    const userdata: any = {
      firstName: "Some",
      surname: "One",
      email: "someone@example.com1",
      password: "someHash",
    };

    // create this job to create the batches
    chai
      .request(server)
      .post("/api/job")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(jobData)
      .then((res: any) => {
        jobID = res.body._id;

        // add the images
        return chai
          .request(server)
          .post("/api/images")
          .set("Content-Type", "multipart/form-data")
          .set("Authorization", "Bearer " + userToken)
          .field("jobID", jobID)
          .attach("image", "tests/test_image/png.png"); // 1
      })
      .then((res: any) => {
        // get the batch ids
        return chai
          .request(server)
          .get("/api/batch/")
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((batches: any) => {
        // get a batch id for our particular job
        for (let batch of batches.body) {
          if (String(batch.job) === String(jobID)) {
            batchID = batch._id;
          }
        }

        // accept the first batch
        return chai
          .request(server)
          .put("/api/batch/labeller/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
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
        // create another user
        return chai
          .request(server)
          .post("/api/auth/register")
          .set("Content-Type", "application/json; charset=utf-8")
          .send(userdata);
      })
      .then((res: any) => {
        // accept the job with the new user - but do NOT complete
        return chai
          .request(server)
          .put("/api/batch/labeller/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + res.body.token);
      })
      .then((res: any) => {
        // NOW, have a job withn one batch, that requires two labellers
        // two have accepted the job, but only one has completed the job

        // verify that the job is not completed
        return isJobCompleted(Mongoose.Types.ObjectId(jobID));
      })
      .then((status: boolean) => {
        expect(status).to.be.false;
        done();
      })
      .catch(done);
  });

  it("count a labeller's completed jobs - correct", (done: any) => {
    // get the batch id
    let batchID: string;
    chai
      .request(server)
      .get("/api/batch/")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
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
        // complete the batch
        return chai
          .request(server)
          .put("/api/batch/complete/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // verify that the count is correct
        return countCompletedJobsForUser(Mongoose.Types.ObjectId(userId));
      })
      .then((count: number) => {
        expect(count).to.equal(1);
        done();
      })
      .catch(done);
  });

  it("count a labeller's completed jobs - when some are incomplete", (done: any) => {
    // get the batch id
    let dummyBatchID: string;
    let newBatchId: string;
    let newJobID: string;

    // this new job will have two labellers and one batch - accept and complete the batch for one user
    // means the job will still be incomplete
    const newJobData: any = {
      title: "Some title",
      description: "Some description",
      //date created does not need to be inserted because it is not changable by user
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
    };

    // create a new job, which we will not complete
    chai
      .request(server)
      .post("/api/job")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(newJobData)
      .then((res: any) => {
        newJobID = res.body._id;

        // upload an image to the job we have just created - creates a batch
        return chai
          .request(server)
          .post("/api/images")
          .set("Content-Type", "multipart/form-data")
          .set("Authorization", "Bearer " + userToken)
          .field("jobID", dummyJobId)
          .attach("image", "tests/test_image/png.png");
      })
      .then((res: any) => {
        // get batch IDs for both the jobs
        return chai
          .request(server)
          .get("/api/batch/")
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((batches: any) => {
        // find batches for each job
        for (let batch of batches.body) {
          if (String(batch.job) === String(dummyJobId)) {
            dummyBatchID = batch._id;
          } else if (String(batch.job) === String(newJobID)) {
            newBatchId = batch._id;
          }
        }

        // accept the dummy batch
        return chai
          .request(server)
          .put("/api/batch/labeller/" + dummyBatchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // complete the dummy batch
        return chai
          .request(server)
          .put("/api/batch/complete/" + dummyBatchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // accept the new batch
        return chai
          .request(server)
          .put("/api/batch/labeller/" + dummyBatchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // complete the new batch - two labellers required, so the job won't be complete
        return chai
          .request(server)
          .put("/api/batch/complete/" + newJobID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // verify that the count is correct
        return countCompletedJobsForUser(Mongoose.Types.ObjectId(userId));
      })
      .then((count: number) => {
        expect(count).to.equal(1);
        done();
      })
      .catch(done);
  });
});
