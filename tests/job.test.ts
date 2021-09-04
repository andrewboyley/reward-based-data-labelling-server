import chai from "chai";
import chaiHttp from "chai-http";
import rimraf from "rimraf";
const VerifyToken = require("../src/modules/auth/VerifyToken");

import dbHandler from "../src/db-handler";
import server from "../src/server";

const expect = chai.expect;

chai.use(chaiHttp);

describe("GET /job", () => {
  // endpoint
  const endpoint = "/api/job";

  // dummy inserted ids
  let userToken = "";
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
    mockJob = res.body;

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
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
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
        expect(body).to.have.property("title");
        expect(body).to.have.property("description");
        expect(body).to.have.property("author");
        expect(body).to.have.property("dateCreated");
        expect(body).to.have.property("labels");
        done();
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

  // disconnect from in-memory db
  after(async function () {
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
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
