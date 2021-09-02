import chai from "chai";
import chaiHttp from "chai-http";

import dbHandler from "../src/db-handler";
import server from "../src/server";

const expect = chai.expect;

chai.use(chaiHttp);

describe("GET /batch", () => {

	const endpoint = "/api/batch/";

	// dummy data
	let userToken = "";
	let dummyJobId: string;

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
		labellers: [],
	};

	before(async function () {
		await dbHandler.connect();
	})

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
			labellers: [],
		};

		// create this job to create the batches 
		res = await chai
			.request(server)
			.post("/api/job")
			.set("Content-Type", "application/json; charset=utf-8")
			.set("Authorization", "Bearer " + userToken)
			.send(dataInsert);

		dummyJobId = res.body._id;

		res = await chai
			.request(server)
			.post("/api/images")
			.set("Content-Type", "multipart/form-data")
			.field("jobID", dummyJobId)
			.attach("image", "tests/test_image/png.png");


	})

	// disconnect from in-memory db
	after(async function () {
		await dbHandler.close();
	});

	// successful retrieval of all batches - return 200
	it("All batches retrieved", (done: any) => {
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
				expect(body).to.have.property("job", dummyJobId);
				expect(body).to.have.property("batch_number", 0);

				//expect(body.labels).deep.equal(dataInsert["labels"]); // compare the elements of the arrays
				done();
			});
	});


});