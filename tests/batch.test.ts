import chai from "chai";
import chaiHttp from "chai-http";

import dbHandler from "../src/db-handler";
import server from "../src/server";

const expect = chai.expect;

chai.use(chaiHttp);

describe("GET /batch", () => {

	const endpoint = "/api/batch";

	// dummy data
	let userToken = "";

	let index = 0;
	let dummyJobId: string;

	const user: any = {
		firstName: "Some",
		surname: "One",
		email: "someone@example.com",
		password: "someHash",
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

		userToken = res.body.token;

		mockBatch

	})

	// get the user token

});