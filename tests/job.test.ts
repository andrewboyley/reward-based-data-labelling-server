import chai from "chai";
import chaiHttp from "chai-http";
import request from "superagent";

import dbHandler from "../src/db-handler";
import server from "../src/server";

const expect = chai.expect;

chai.use(chaiHttp);

describe("GET /job", () => {
    // endpoint
    const endpoint = "/api/job";

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
    author: "60942b9c1878e068fc0cf954",  //this get replaced later on
    labels: [],
    //reward: 1
    };

    // connect to in-memory db
    before(async function () {
    await dbHandler.connect();
    });

    // empty mongod before each test (so no conflicts)
    beforeEach(async function () {
    await dbHandler.clear();

    let authorID = ""
    // add a dummy user
    await chai
      .request(server)
      .post("/api/user/")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(user)
      .end((err: any, res: request.Response) => {
        //getting the user ID
        authorID = res.body._id;
        dataInsert = {
          title: "Some title",
          description: "Some description",
          //date created does not need to be inserted because it is not changable by user
          author: authorID, 
          labels: [],
          //reward: 1
          };
      });
    // add a dummy job
    await chai
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

    // get correct details
    const dataJob: any = {
        title: dataInsert["title"],
        description: dataInsert["description"],
        author: dataInsert["author"],
        //date created not affected by user input
        labels: dataInsert["labels"],
        //reward: dataInsert["reward"]
    };

    chai
        .request(server)
        .get(endpoint) 
        .set("Content-Type", "application/json; charset=utf-8")
        .query(dataJob)
        .end((err: any, res: request.Response) => {
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
        expect(res.body).to.have.property("description", dataInsert["description"]);
        expect(res.body).to.have.property("author", dataInsert["author"]);
        expect(res.body).to.have.property("dateCreated", dataInsert["dateCreated"]);
        expect(res.body).to.have.property("labels", dataInsert["labels"]);
        done();
        });
    });

    // I don't think there is such a thing as an unsuccessful collection of all of the jobs

    // successful job retrieval of a job by id - return 200
    it("One job retrieved by ID", (done: any) => {
    // returns error code and message

    // get correct details
    const dataJob: any = {
        title: dataInsert["A second job"],
        description: dataInsert["Another job description"],
        author: dataInsert["60942b9c1878e068fc0cf954"],
        dateCreated: dataInsert["2021-05-06T18:18:32.385Z"],
        labels: ["a"],
        //reward: 1
    };

    chai
      .request(server)
      .get(endpoint)///////////////How do I get the ID here?
      .set("Content-Type", "application/json; charset=utf-8")
      .query(dataJob)
      .end((err: any, res: request.Response) => {
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
        expect(res.body).to.have.property("description", dataInsert["description"]);
        expect(res.body).to.have.property("author", dataInsert["author"]);
        expect(res.body).to.have.property("dateCreated", dataInsert["dateCreated"]);
        expect(res.body).to.have.property("labels", dataInsert["labels"]);
        done();
      });
      
  });

  // unsuccessful job collection by ID - return 401
  // it would need to not match the ID but I'm not sure how you would retrieve that because it's autogenerated
  it("Invalid request Job ID not found", (done: any) => {
    // returns error code and message

    // DB has one entry - craft so these can't match anything -----------Would you then craft the ID?
    const dataJob: any = {
        // break the ID
        title: dataInsert["A second job"],
        description: dataInsert["Another job description"],
        author: dataInsert["60942b9c1878e068fc0cf954"],
        dateCreated: dataInsert["2021-05-06T18:18:32.385Z"],
        labels: ["a"],
        //reward: 1
    };

    chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .query(dataJob)
      .end((err: any, res: request.Response) => {
        // check response (and property values where applicable)
        expect(err).to.be.null;
        expect(res).to.have.status(401);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property("error", "Job not found");
        done();
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
        "items": [],   --------------------------------------------what is an item?
        "_id": "609432f8a1233638d8746b6b",
        "title": "A second job",
        "description": "Another job description",
        "author": "60942b9c1878e068fc0cf954",
        "dateCreated": "2021-05-06T18:18:32.385Z"
      }
    */
      
    });

    // insert successful
    it("All user fields present, except profile picture", (done: any) => {
        // returns user object
        // this case should use the generic image
        const dataInsert: any = {
            title: "Some title",
            description: "Some description",
            dateCreated: Date.now,
            author: "60942b9c1878e068fc0cf954",  //////////////////////////////needs to be fixed 
            labels: [],
            //reward: 1
        };

        chai
        .request(server)
        .post(endpoint)
        .set("Content-Type", "application/json; charset=utf-8")
        .send(dataInsert)
        .end((err: any, res: request.Response) => {
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
            expect(res.body).to.have.property("description", dataInsert["description"]);
            expect(res.body).to.have.property("author", dataInsert["author"]);
            expect(res.body).to.have.property("dateCreated", dataInsert["dateCreated"]);
            expect(res.body).to.have.property("labels", dataInsert["labels"]);
            done();
        });
    });

    // insert fails - return 422 error
    it("One required field missing", (done: any) => {
        const dataInsert: any = {
            title: "Some title",
            description: "Some description",
            dateCreated: Date.now,
            author: "60942b9c1878e068fc0cf954",  //////////////////////////////needs to be fixed 
            //labels: [], -- this one is missing
            //reward: 1
        };

        chai
        .request(server)
        .post(endpoint)
        .set("Content-Type", "application/json; charset=utf-8")
        .send(dataInsert)
        .end((err: any, res: request.Response) => {
            // check response
            expect(err).to.be.null;
            expect(res).to.have.status(422);
            expect(res).to.have.header(
            "Content-Type",
            "application/json; charset=utf-8"
            );
            expect(res).to.be.json;
            expect(res.body).to.have.property(
            "error",
            "Missing the following field(s): labels"
            );
            done();
        });
    });

    // insert fails - return 422 error
    it("Multiple required fields missing", (done: any) => {
        const dataInsert: any = {
            title: "Some title",
            description: "Some description",
            //dateCreated: Date.now,
            author: "60942b9c1878e068fc0cf954",  //////////////////////////////needs to be fixed 
            //labels: [],
            //reward: 1
        };

        chai
        .request(server)
        .post(endpoint)
        .set("Content-Type", "application/json; charset=utf-8")
        .send(dataInsert)
        .end((err: any, res: request.Response) => {
            // check response
            expect(err).to.be.null;
            expect(res).to.have.status(422);
            expect(res).to.have.header(
            "Content-Type",
            "application/json; charset=utf-8"
            );
            expect(res).to.be.json;
            expect(res.body).to.have.property(
            "error",
            "Missing the following field(s): Date Created, labels"
            );
            done();
        });
    });

    
});