import chai from "chai";
import chaiHttp from "chai-http";

import dbHandler from "../src/db-handler";
import server from "../src/server";
const VerifyToken = require("../src/modules/auth/VerifyToken");

const expect = chai.expect;

// setup testing to mock network requests
chai.use(chaiHttp);

describe("POST /auth/login", () => {
  // endpoint
  const endpoint = "/api/auth/login";

  // keep track of the user token
  let loginToken: string;

  // dummy user insert
  const dataInsert: any = {
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

    // add a dummy user
    const res = await chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(dataInsert);

    // get the user's token
    loginToken = res.body.token;
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

    // get correct details
    const dataLogin: any = {
      email: dataInsert["email"],
      password: dataInsert["password"],
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(dataLogin)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.not.have.property("_id"); // we are returning a token instead of an id
        expect(res.body).to.have.property("firstName", dataInsert["firstName"]);
        expect(res.body).to.have.property("surname", dataInsert["surname"]);
        expect(res.body).to.have.property("email", dataInsert["email"]);
        expect(res.body).to.not.have.property("password"); // don't return the hash
        expect(res.body).to.have.property("profilePicturePath", "generic.jpeg");
        expect(res.body).to.have.property("token");
        done();
      });
  });

  // unsuccessful login - return 401
  it("Invalid credentials provided - email does not exist", (done: any) => {
    // returns error code and message

    // DB has one entry - craft so these can't match anything
    const dataLogin: any = {
      email: "definitelyInvalid" + dataInsert["email"],
      password: "someWonkyHash",
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(dataLogin)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        // expect error to occur
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

  // unsuccessful login - return 401
  it("Invalid credentials provided - email exists, password incorrect", (done: any) => {
    // returns error code and message

    // DB has one entry - craft so these can't match anything
    const dataLogin: any = {
      email: dataInsert["email"],
      password: "someWonkyHash" + dataInsert["password"],
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(dataLogin)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        // expect error to occur
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

  // no email - return 422
  it("Email not provided", (done: any) => {
    // returns error code and message

    // make request without email
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send({})
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        // expect error to occur
        expect(err).to.be.null;
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property("error", "Email not provided");
        done();
      });
  });

  // no password - return 422
  it("Password not provided", (done: any) => {
    // returns error code and message

    // make request with email, but without password
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send({ email: dataInsert["email"] })
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        // expect error to occur
        expect(err).to.be.null;
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property("error", "Password not provided");
        done();
      });
  });
});

describe("POST /auth/register", () => {
  // endpoint
  const endpoint = "/api/auth/register";

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

  // todo - write this test when add profile pic functionality
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
      .end((err: any, res: ChaiHttp.Response) => {
        // check response (and property values where applicable)
        expect(err).to.be.null;
        expect(res).to.have.status(201);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.not.have.property("_id"); // we use the user token instead of id
        expect(res.body).to.have.property("firstName", data["firstName"]);
        expect(res.body).to.have.property("surname", data["surname"]);
        expect(res.body).to.have.property("email", data["email"]);
        expect(res.body).to.not.have.property("password"); // don't return the hash
        expect(res.body).to.have.property("profilePicturePath", "generic.jpeg");
        expect(res.body).to.have.property("token");
        done();
      });
  });

  // no email - 422
  it("Email not provided", (done: any) => {
    // returns error code and message

    // contruct data with missing email
    const data: any = {
      firstName: "Some",
      surname: "One",
      // email: "someone1@example.com",
      password: "someHash",
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(data)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response
        // expect an error to occur
        expect(err).to.be.null;
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property("error", "Email not provided");
        done();
      });
  });

  // no password - 422
  it("Password not provided", (done: any) => {
    // returns error code and message

    // construct data with missing password
    const data: any = {
      firstName: "Some",
      surname: "One",
      email: "someone1@example.com",
      // password: "someHash",
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(data)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response
        // expect an error to occur
        expect(err).to.be.null;
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property("error", "Password not provided");
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

    // construct data with missing field that is not email, password
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
      .end((err: any, res: ChaiHttp.Response) => {
        // check response
        // expect data error to occur
        expect(err).to.be.null;
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "error",
          "User validation failed: surname: Surname not provided"
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

    // construct data with multiple missing fields, that aren't email, password
    const data: any = {
      email: "someone@example.com",
      password: "One",
    };

    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(data)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response
        // expect data error to occur
        expect(err).to.be.null;
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property(
          "error",
          "User validation failed: surname: Surname not provided, firstName: First Name not provided"
        );

        done();
      });
  });

  // insert fails - return 422 error
  it("Duplicate email provided", (done: any) => {
    // returns error code and message

    // contruct dummy user
    const data: any = {
      firstName: "Some",
      surname: "One",
      email: "someone10@example.com",
      password: "someHash",
    };

    // add the dummy user to the collection
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(data)
      .end((err1: any, res1: ChaiHttp.Response) => {
        // try and add the dummy user again
        chai
          .request(server)
          .post(endpoint)
          .set("Content-Type", "application/json; charset=utf-8")
          .send(data)
          .end((err: any, res: ChaiHttp.Response) => {
            // expect error to occur due to UNIQUE identifier on emails in model
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

describe("GET /auth/id", () => {
  // endpoint
  const endpoint = "/api/auth/id";

  // dummy user data
  const user: any = {
    firstName: "Some",
    surname: "One",
    email: "someone@example.com",
    password: "someHash",
  };

  let userToken: string;

  // connect to in-memory db
  before(async function () {
    await dbHandler.connect();
  });

  // empty mongod before each test (so no conflicts)
  beforeEach(async function () {
    await dbHandler.clear();

    // create dummy user
    let res: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(user);

    // get the user's token
    userToken = res.body.token;
  });

  // disconnect from in-memory db
  after(async function () {
    await dbHandler.close();
  });

  it("returns the user id", (done: any) => {
    // successfully translates JWT to id

    chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response
        // expect to have an id property
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.have.property("id");

        done();
      });
  });

  it("rejects invalid tokens", (done: any) => {
    // returns error code and message

    // craft invalid token
    const dummyToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwYmQzYzI2NDMyM2QwZjkwNjI3NWY0MiIsImlhdCI6MTYyMzAxNDQzOCwiZXhwIjoxNjIzMDE2MjM4fQ.VmvD5SzDg9xFeQQN5cB0jsa4bgHoOURMQroXhE_4QCU";

    chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + dummyToken)
      .end((err: any, res: ChaiHttp.Response) => {
        // check response
        // expect invalid token error
        expect(err).to.be.null;
        expect(res).to.have.status(401);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;
        expect(res.body).to.not.have.property("id");
        expect(res.body).to.have.property(
          "message",
          "Failed to authenticate token."
        );

        done();
      });
  });
});
