import chai from "chai";
import chaiHttp from "chai-http";
import rimraf from "rimraf";
import dbHandler from "../src/db-handler";
import server from "../src/server";
import BatchController from "../src/modules/batch/batch.controller";
import Mongoose from "mongoose";
import spies from "chai-spies"

const expect = chai.expect;

chai.use(chaiHttp);
chai.use(spies);

describe("Batch functionalities", () => {

	const endpoint = "/api/batch/";

	// dummy data
	let userToken = "";

	let dummyJobId: any;
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
		mockJob = res.body;

		await chai
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

	afterEach(async () => {
		rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
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

	it("Retrieves one batch and the images with the correct id", (done: any) => {
		chai
			.request(server)
			.get(endpoint)
			.set("Content-Type", "application/json; charset=utf-8")
			.set("Authorization", "Bearer " + userToken).then(res1 => {
				const mockBatch = res1.body[0];
				return chai
					.request(server)
					.get(endpoint + "/" + mockBatch._id)
					.set("Content-Type", "application/json; charset=utf-8")
					.set("Authorization", "Bearer " + userToken);

			}).then(res2 => {
				expect(res2).to.have.status(200);
				expect(res2).to.have.header(
					"Content-Type",
					"application/json; charset=utf-8"
				);
				const body = res2.body;
				expect(body).to.have.property("images");
				expect(body.images.length).to.not.equal(0);
				done();
			}).catch(done);
	});


	it("Returns error when invalid ID provided", (done: any) => {

		chai
			.request(server)
			.get(endpoint + "/" + "badID")
			.set("Content-Type", "application/json; charset=utf-8")
			.set("Authorization", "Bearer " + userToken)
			.then(res => {
				expect(res.status).to.equal(500);
				done();
			}).catch(done)
	});

	it("Determines the available batches", (done: any) => {
		chai
			.request(server)
			.get("/api/auth/id")
			.set("Content-Type", "application/json; charset=utf-8")
			.set("Authorization", "Bearer " + userToken).then(res => {
				const userID = res.body.id;
				return BatchController
					.determineAvailableBatches(userID, dummyJobId, mockJob.numLabellersRequired)


			}).then(res => {
				expect(res.length).to.equal(1);
				expect(res[0].job.equals(dummyJobId)).to.equal(true);
				done();
			}).catch(done);

	})

	it("Return null if no available batches was found", (done: any) => {
		const badID: any = "4edd40c86762e0fb12000003";
		chai
			.request(server)
			.get("/api/auth/id")
			.set("Content-Type", "application/json; charset=utf-8")
			.set("Authorization", "Bearer " + userToken).then(res => {
				const userID = res.body.id;
				return BatchController
					.determineAvailableBatches(userID, Mongoose.Types.ObjectId(badID), mockJob.numLabellersRequired)


			}).then(res => {
				expect(res.length).to.equal(0);

				done();
			}).catch(done);

	})

});

describe("Adding labeller", () => {

	const endpoint = "/api/batch/";

	// dummy data
	let userToken = "";
	let mockUserID = "";

	let dummyJobId: any;
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
		mockJob = res.body;

		res = await chai
			.request(server)
			.post("/api/images")
			.set("Content-Type", "multipart/form-data")
			.set("Authorization", "Bearer " + userToken)
			.field("jobID", dummyJobId)
			.attach("image", "tests/test_image/png.png");

		res = await chai
			.request(server)
			.get("/api/auth/id")
			.set("Content-Type", "application/json; charset=utf-8")
			.set("Authorization", "Bearer " + userToken);

		mockUserID = res.body.id;

	})

	// disconnect from in-memory db
	after(async function () {
		await dbHandler.close();
	});

	afterEach(async () => {
		rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
	});

	it("Adds a new labeller to the list of existing labellers", (done: any) => {
		chai
			.request(server)
			.get(endpoint)
			.set("Content-Type", "application/json; charset=utf-8")
			.set("Authorization", "Bearer " + userToken).then(res1 => {
				const mockBatch = res1.body[0];
				return chai
					.request(server)
					.put(endpoint + "/labeller/" + mockBatch._id)
					.set("Content-Type", "application/json; charset=utf-8")
					.set("Authorization", "Bearer " + userToken);

			}).then(res2 => {

				expect(res2.status).to.equal(200);
				expect(res2.body.labellers.length).to.equal(1);
				expect(res2.body.labellers[0].completed).to.equal(false);
				done();
			}).catch(done);
	});

	it("Returns 400 when request body is malformed", (done: any) => {
		// create mock request response and next objects
		const mockReq: any = {}

		const mockRes: any = {
			status: (statusCode: number) => { return mockRes },
			send: () => { }
		}
		const next = () => { };

		// spy on the functions inside the dummy response object
		const spy = chai.spy.on(mockRes, "status");


		BatchController.addLabeller(mockReq, mockRes, next).then(res => {
			console.log(res);
			expect(spy).to.have.been.called.with(400);
			done();
		}).catch(done);
	})

	it("Returns 404 when wrong objectID used", (done: any) => {
		function status(statusCode: any) { return mockRes; }
		const mockReq: any = {
			body: {
				userId: mockUserID
			},
			params: {
				batch: Mongoose.Types.ObjectId("4edd40c86762e0fb12000003")
			}
		}
		const mockRes: any = {
			status: status,
			send: () => { }
		}
		const next = () => { };
		const spy = chai.spy.on(mockRes, "status");
		BatchController.addLabeller(mockReq, mockRes, next).then(res => {
			expect(spy).to.have.been.called.with(404);
			done();
		}).catch(done);
	})


	it("Returns 404 when bad objectID used", (done: any) => {
		function status(statusCode: any) { return mockRes; }
		const mockReq: any = {
			body: {
				userId: mockUserID
			},
			params: {
				batch: "BadID"
			}
		}
		const mockRes: any = {
			status: status,
			send: () => { }
		}
		const next = () => { };
		const spy = chai.spy.on(mockRes, "status");
		BatchController.addLabeller(mockReq, mockRes, next).then(res => {
			expect(spy).to.have.been.called.with(404);
			done();
		}).catch(done);
	})

});

describe("Removing labeller", () => {

	const endpoint = "/api/batch/";

	// dummy data
	let userToken = "";
	let mockUserID = "";

	let dummyJobId: any;
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
		mockJob = res.body;

		res = await chai
			.request(server)
			.post("/api/images")
			.set("Content-Type", "multipart/form-data")
			.set("Authorization", "Bearer " + userToken)
			.field("jobID", dummyJobId)
			.attach("image", "tests/test_image/png.png");

		res = await chai
			.request(server)
			.get("/api/auth/id")
			.set("Content-Type", "application/json; charset=utf-8")
			.set("Authorization", "Bearer " + userToken);

		mockUserID = res.body.id;

	})

	// disconnect from in-memory db
	after(async function () {
		await dbHandler.close();
	});

	afterEach(async () => {
		rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
	});

	it("Removing a labellers from batch", (done: any) => {
		let mockBatch: any;

		chai
			.request(server)
			.get(endpoint)
			.set("Content-Type", "application/json; charset=utf-8")
			.set("Authorization", "Bearer " + userToken).then(res1 => {
				mockBatch = res1.body[0];
				return chai
					.request(server)
					.put(endpoint + "/labeller/" + mockBatch._id)
					.set("Content-Type", "application/json; charset=utf-8")
					.set("Authorization", "Bearer " + userToken);


			}).then(res2 => {
				return chai
					.request(server)
					.delete(endpoint + "/labeller/" + mockBatch._id)
					.set("Content-Type", "application/json; charset=utf-8")
					.set("Authorization", "Bearer " + userToken);


			}).then(res3 => {
				expect(res3.status).to.equal(204);
				done();
			}).catch(done);
	});

	// it("Returns 500 when something goes wrong", (done: any) => {
	// 	let mockBatch: any;

	// 	chai
	// 		.request(server)
	// 		.get(endpoint)
	// 		.set("Content-Type", "application/json; charset=utf-8")
	// 		.set("Authorization", "Bearer " + userToken).then(res1 => {
	// 			mockBatch = res1.body[0];
	// 			return chai
	// 				.request(server)
	// 				.delete(endpoint + "/labeller/" + mockBatch._id)
	// 				.set("Content-Type", "application/json; charset=utf-8")
	// 				.set("Authorization", "Bearer " + userToken)
	// 		}).then(res2 => {
	// 			expect(res2.status).to.equal(500);
	// 			done();
	// 		}).catch(done);
	// });

	// it("Returns 404 when no batch is found", (done: any) => {
	// 	// create mock request response and next objects
	// 	const mockReq: any = {}

	// 	const mockRes: any = {
	// 		status: (statusCode: number) => { return mockRes },
	// 		send: () => { }
	// 	}
	// 	const next = () => { };

	// 	// spy on the functions inside the dummy response object
	// 	const spy = chai.spy.on(mockRes, "status");


	// 	BatchController.addLabeller(mockReq, mockRes, next).then(res => {
	// 		console.log(res);
	// 		expect(spy).to.have.been.called.with(400);
	// 		done();
	// 	}).catch(done);
	// })

	// it("Returns 404 when wrong objectID used", (done: any) => {
	// 	function status(statusCode: any) { return mockRes; }
	// 	const mockReq: any = {
	// 		body: {
	// 			userId: mockUserID
	// 		},
	// 		params: {
	// 			batch: Mongoose.Types.ObjectId("4edd40c86762e0fb12000003")
	// 		}
	// 	}
	// 	const mockRes: any = {
	// 		status: status,
	// 		send: () => { }
	// 	}
	// 	const next = () => { };
	// 	const spy = chai.spy.on(mockRes, "status");
	// 	BatchController.addLabeller(mockReq, mockRes, next).then(res => {
	// 		expect(spy).to.have.been.called.with(404);
	// 		done();
	// 	}).catch(done);
	// })


	// it("Returns 404 when bad objectID used", (done: any) => {
	// 	function status(statusCode: any) { return mockRes; }
	// 	const mockReq: any = {
	// 		body: {
	// 			userId: mockUserID
	// 		},
	// 		params: {
	// 			batch: "BadID"
	// 		}
	// 	}
	// 	const mockRes: any = {
	// 		status: status,
	// 		send: () => { }
	// 	}
	// 	const next = () => { };
	// 	const spy = chai.spy.on(mockRes, "status");
	// 	BatchController.addLabeller(mockReq, mockRes, next).then(res => {
	// 		expect(spy).to.have.been.called.with(404);
	// 		done();
	// 	}).catch(done);
	// })

});
