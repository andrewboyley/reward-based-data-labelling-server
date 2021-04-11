// process.env.NODE_ENV = "test";

// import fs - test image uploads
import fs from "fs";
import path from "path";

import chai from "chai";
import chaiHttp from "chai-http";
import request from "superagent";

import dbHandler from "../src/db-handler";
import server from "../src/server";

const expect = chai.expect;

chai.use(chaiHttp);

describe("GET /user - login", () => {
  // endpoint
  const endpoint = "/api/user/login";

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
      "email": "someone2@example.com",
      "password": "someHash"
    }
  */

  // successful login - return 200
  it("Valid credentials provided", (done: any) => {
    // returns error code and message
    const dataInsert: any = {
      firstName: "Some",
      surname: "One",
      email: "someone@example.com",
      password: "someHash",
    };

    const dataLogin: any = {
      email: dataInsert["email"],
      password: dataInsert["password"],
    };

    chai
      .request(server)
      .post("/api/user/")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(dataInsert)
      .end((err1: any, res1: request.Response) => {
        chai
          .request(server)
          .get(endpoint)
          .set("Content-Type", "application/json; charset=utf-8")
          .query(dataLogin)
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
            expect(res.body).to.have.property(
              "firstName",
              dataInsert["firstName"]
            );
            expect(res.body).to.have.property("surname", dataInsert["surname"]);
            expect(res.body).to.have.property("email", dataInsert["email"]);
            expect(res.body).to.not.have.property("password"); // don't return the hash
            expect(res.body).to.have.property(
              "profilePicturePath",
              "generic.jpeg"
            );
            done();
          });
      });
  });

  // unsuccessful login - return 401
  it("Invalid credentials provided", (done: any) => {
    // returns error code and message

    // working with empty DB so these can't match anything
    const dataLogin: any = {
      email: "definitely@not.email",
      password: "someWonkyHash",
    };

    chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .query(dataLogin)
      .end((err: any, res: request.Response) => {
        // check response (and property values where applicable)
        expect(err).to.be.null;
        expect(res).to.have.status(401);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property("error", "Login credentials invalid");
        done();
      });
  });

  // missing field(s) - return 422
  it("Required field(s) missing", (done: any) => {
    // returns error code and message

    chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .query({})
      .end((err: any, res: request.Response) => {
        // check response (and property values where applicable)
        expect(err).to.be.null;
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "error",
          "Missing the following field(s): email, password"
        );
        done();
      });
  });
});

describe("POST /user", () => {
  // endpoint
  const endpoint = "/api/user";

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
      "firstName": "William",
      "surname": "Hill",
      "email": "someone2@example.com",
      "password": "someHash"
    }
  */

  // todo - write this test
  // insert successful
  // it("All user fields present, including profile picture", (done: any) => {
  //   // returns user object
  //   const data: any = {
  //     firstName: "Some",
  //     surname: "One",
  //     email: "someone@example.com",
  //     password: "someHash",
  //     // profilePicturePath: "someone_picture.jpg",
  //   };
  //   chai
  //     .request(server)
  //     .post(endpoint)
  //     .set("Content-Type", "multipart/form-data")
  //     .field("firstName", "Some")
  //     .field("surname", "One")
  //     .field("email", "someone2@example.com")
  //     .field("password", "someHash")
  //     .attach(
  //       "profilePicture", // field name
  //       fs.readFileSync(path.resolve(__dirname, "../uploads/generic.jpeg")), // file
  //       "generic.jpeg" // filename
  //     )
  //     .end((err: any, res: request.Response) => {
  //       // check response (and property values where applicable)
  //       expect(err).to.be.null;
  //       expect(res).to.have.status(201);
  //       expect(res).to.have.header(
  //         "Content-Type",
  //         "application/json; charset=utf-8"
  //       );
  //       expect(res).to.be.json;
  //       expect(res.body).to.have.property("_id");
  //       expect(res.body).to.have.property("firstName", data["firstName"]);
  //       expect(res.body).to.have.property("surname", data["surname"]);
  //       expect(res.body).to.have.property("email", data["email"]);
  //       expect(res.body).to.not.have.property("password"); // don't return password
  //       expect(res.body)
  //         .to.have.property("profilePicturePath")
  //         .and.not.equal("")
  //         .and.not.equal("generic.jpeg");
  //       done();
  //     });
  // });

  // insert successful
  it("All user fields present, except profile picture", (done: any) => {
    // returns user object
    // this case should use the generic image
    const data: any = {
      firstName: "Some",
      surname: "One",
      email: "someone@example.com",
      password: "someHash",
    };
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(data)
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
        expect(res.body).to.have.property("firstName", data["firstName"]);
        expect(res.body).to.have.property("surname", data["surname"]);
        expect(res.body).to.have.property("email", data["email"]);
        expect(res.body).to.not.have.property("password"); // don't return the hash
        expect(res.body).to.have.property("profilePicturePath", "generic.jpeg");
        done();
      });
  });

  // insert fails - return 422 error
  it("One required field missing", (done: any) => {
    // returns error code and message

    /*
    {
      "error": {
        "errors": {
            "firstName": {
                "name": "ValidatorError",
                "message": "First Name not provided",
                "properties": {
                    "message": "First Name not provided",
                    "type": "required",
                    "path": "firstName"
                },
                "kind": "required",
                "path": "firstName"
            }
        },
        "_message": "User validation failed",
        "name": "ValidationError",
        "message": "User validation failed: firstName: First Name not provided"
      }
    } 
    */

    const data: any = {
      firstName: "Some",
      email: "someone1@example.com",
      password: "someHash",
    };
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(data)
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
          "Missing the following field(s): surname"
        );
        done();
      });
  });

  // insert fails - return 422 error
  it("Multiple required fields missing", (done: any) => {
    // returns error code and message

    /*
    {
      "error": {
        "errors": {
            "surname": {
                "name": "ValidatorError",
                "message": "Surname not provided",
                "properties": {
                    "message": "Surname not provided",
                    "type": "required",
                    "path": "surname"
                },
                "kind": "required",
                "path": "surname"
            },
            "firstName": {
                "name": "ValidatorError",
                "message": "First Name not provided",
                "properties": {
                    "message": "First Name not provided",
                    "type": "required",
                    "path": "firstName"
                },
                "kind": "required",
                "path": "firstName"
            }
        },
        "_message": "User validation failed",
        "name": "ValidationError",
        "message": "User validation failed: surname: Surname not provided, firstName: First Name not provided"
      }
    }
    */

    const data: any = {
      firstName: "Some",
      surname: "One",
    };
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(data)
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
          "Missing the following field(s): email, password"
        );

        done();
      });
  });

  // insert fails - return 422 error
  it("Duplicate email provided", (done: any) => {
    // returns error code and message
    const data: any = {
      firstName: "Some",
      surname: "One",
      email: "someone10@example.com",
      password: "someHash",
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(data)
      .end((err1: any, res1: request.Response) => {
        chai
          .request(server)
          .post(endpoint)
          .set("Content-Type", "application/json; charset=utf-8")
          .send(data)
          .end((err: any, res: request.Response) => {
            expect(res).to.have.status(422);
            expect(res).to.have.header(
              "Content-Type",
              "application/json; charset=utf-8"
            );
            expect(res).to.be.json;
            expect(res.body).to.have.property(
              "error",
              "This user has already been created"
            );
            done();
          });
      });
  });
});
