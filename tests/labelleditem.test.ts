// process.env.NODE_ENV = "test";

// import fs - test image uploads
import fs from "fs";
import path from "path";

import chai from "chai";
import chaiHttp from "chai-http";
import rimraf from "rimraf"
import dbHandler from "../src/db-handler";
import server from "../src/server";

const expect = chai.expect;

chai.use(chaiHttp);

describe("POST /images - upload image", () => {
  const endpoint = "/api/images";
  // connect to in-memory db
	var jobID:string;
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

		var userID;

    await dbHandler.clear();
		await chai
		.request(server)
		.post("/api/user/")
		.set("Content-Type", "application/json; charset=utf-8")
		.send(userInsert).then( 
			function(result){
				userID = result.body._id;
			},function(err){
				console.log(err);
			});

		const jobInsert: any = {
			author: userID,
			title: "some title",
			description:"some description",
			password: "someHash",
		};

		await chai
		.request(server)
		.post("/api/job/")
		.set("Content-Type", "application/json; charset=utf-8")
		.send(jobInsert).then(
			function(result){
			jobID = result.body._id;
		},function(err){
			console.log(err);
		})
  });

  // disconnect from in-memory db
  after(async function () {
    await dbHandler.close();
  });

	it('save image in uploads folder',(done:any) =>{
		chai.
			request(server)
			.post(endpoint)
			.set('Content-Type', 'multipart/form-data')
			.field("jobID", jobID)
			.attach('image', 'tests/test_image/test.png')
			.end(function (err, res) {
				if (err) {
						console.log(err);
				} 
				else expect(res.status).to.equal(200);
				rimraf("uploads/jobs/"+jobID, function(){console.log("removed test image")});
				done();
		});
	})
  
});
