import chai from "chai";
import chaiHttp from "chai-http";
// import request from "superagent";

import dbHandler from "../src/db-handler";
import server from "../src/server";

const expect = chai.expect;

chai.use(chaiHttp);

describe("GET /job", () => {
  // endpoint
  const endpoint = "/api/job";

  // dummy inserted ids
  let authorID = "";
  let dummyJobId: string;
  let dummyAcceptId: string;
  let dummyAvailableId: string;

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
    author: "Replaced in a bit",
    numLabellersRequired: 2,
    labels: ["A"],
    reward: 1,
    labellers: ["f" + authorID.slice(1)],
  };

  // connect to in-memory db
  before(async function () {
    await dbHandler.connect();
  });

  // empty mongod before each test (so no conflicts)
  beforeEach(async function () {
    await dbHandler.clear();

    // add a dummy user
    let res: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/user/")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(user);

    //getting the user ID
    authorID = res.body._id;
    dummyAcceptId = "f" + authorID.slice(1);
    dummyAvailableId = "e" + authorID.slice(1);

    dataInsert = {
      title: "Some title",
      description: "Some description",
      //date created does not need to be inserted because it is not changable by user
      author: authorID,
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
      labellers: [],
    };

    // add a dummy job - no labellers (so have available jobs)
    res = await chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(dataInsert);

    dummyJobId = res.body._id;

    // add another dummy job - with labeller (so have accepted jobs)
    dataInsert.labellers = [dummyAcceptId];
    res = await chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(dataInsert);
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
        expect(body).to.have.property("author", dataInsert["author"]);
        expect(body).to.have.property("dateCreated");
        expect(body).to.have.property("labels");
        expect(body.labels).deep.equal(dataInsert["labels"]);
        done();
      });
  });

  // I don't think there is such a thing as an unsuccessful collection of all of the jobs

  // successful job retrieval of a job by id - return 200
  it("One job retrieved by ID", (done: any) => {
    // returns error code and message

    chai
      .request(server)
      .get(endpoint + "/" + dummyJobId) ///////////////How do I get the ID here?
      .set("Content-Type", "application/json; charset=utf-8")
      // .query(dataJob)
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
        expect(res.body).to.have.property("author", dataInsert["author"]);
        expect(res.body).to.have.property("dateCreated");
        expect(res.body).to.have.property("labels");
        expect(res.body.labels).deep.equal(dataInsert["labels"]);
        done();
      });
  });

  // unsuccessful job collection by ID - return 401
  // it would need to not match the ID but I'm not sure how you would retrieve that because it's autogenerated
  it("Invalid request Job ID not found", (done: any) => {
    // returns error code and message
    const wrongId = "f" + dummyJobId.slice(1);

    chai
      .request(server)
      .get(endpoint + "/" + wrongId)
      .set("Content-Type", "application/json; charset=utf-8")
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
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

  it("Retrives all authored jobs", (done: any) => {
    // get all the jobs I made
    chai
      .request(server)
      .get(endpoint + "/authored/" + authorID)
      .set("Content-Type", "application/json; charset=utf-8")
      // .query(dataJob)
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
        expect(body).to.have.property("author", authorID);
        expect(body).to.have.property("dateCreated");
        expect(body).to.have.property("labels");
        done();
      });
  });

  it("Retrieves all accepted jobs", (done: any) => {
    // get all the jobs I accepted
    chai
      .request(server)
      .get(endpoint + "/accepted/" + dummyAcceptId)
      .set("Content-Type", "application/json; charset=utf-8")
      // .query(dataJob)
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
        expect(body).to.have.property("labellers");
        expect(body.labellers).to.contain(dummyAcceptId);
        done();
      });
  });

  it("Retrieves all available jobs", (done: any) => {
    // get all the jobs I can accept (not mine, not accepted)
    chai
      .request(server)
      .get(endpoint + "/available/" + dummyAvailableId)
      .set("Content-Type", "application/json; charset=utf-8")
      // .query(dataJob)
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
        expect(body.author).to.not.equal(dummyAvailableId);
        expect(body).to.have.property("dateCreated");
        expect(body).to.have.property("labels");
        expect(body).to.have.property("labellers");
        expect(body.labellers).to.not.contain(dummyAvailableId);
        done();
      });
  });
});

// I don't think missing fields applies here
describe("POST /job", () => {
  // endpoint
  const endpoint = "/api/job";

  // connect to in-memory db
  before(async function () {
    await dbHandler.connect();
  });

  // empty mongod before each test (so no conflicts)
  beforeEach(async function () {
    await dbHandler.clear();
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
    // returns user object
    // this case should use the generic image
    const dataInsert: any = {
      title: "A second job",
      description: "Another job description",
      author: "60942b9c1878e068fc0cf954",
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
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
        expect(res.body).to.have.property("author", dataInsert["author"]);
        expect(res.body).to.have.property("dateCreated");
        expect(res.body).to.have.property("labels");
        expect(res.body.labels).deep.equal(dataInsert["labels"]);
        done();
      });
  });

  // insert fails - return 422 error
  it("One required field missing", (done: any) => {
    const dataInsert: any = {
      title: "A second job",
      description: "Another job description",
      author: "60942b9c1878e068fc0cf954",
      // numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(dataInsert)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response
        expect(err).to.be.null;
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "message",
          "Job validation failed: numLabellersRequired: Number of labellers not provided"
        );
        done();
      });
  });

  // insert fails - return 422 error
  it("Multiple required fields missing", (done: any) => {
    const dataInsert: any = {
      title: "A second job",
      description: "Another job description",
      // author: "60942b9c1878e068fc0cf954",
      // numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(dataInsert)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response
        expect(err).to.be.null;
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "message",
          "Job validation failed: numLabellersRequired: Number of labellers not provided, author: Author not provided"
        );
        done();
      });
  });
});
