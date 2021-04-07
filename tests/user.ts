process.env.NODE_ENV = "test";

import chai from "chai";
import chaiHttp from "chai-http";
import request from "superagent";

import server from "../src/server";

const expect = chai.expect;

chai.use(chaiHttp);

describe("POST /user", () => {
  // before = connect to db
  // after = close db

  it("Successful user insert", (done: any) => {
    let data = {
      name: "me",
    };
    chai
      .request(server)
      .post("/api/user")
      .send(data)
      .end((err: any, res: request.Response) => {
        const body = res.body;
        expect(body).not.to.have.property("type");
        done();
      });
  });

  /*
    All input provided - reject (don't want profile pic)
    All input except profile pic - accept
    All expect a required field(s)
    Duplicate email
    Invalid email

    Illegal characters
    Password meets criteria (here or client-side?)
  */
});
