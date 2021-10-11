import chai from "chai";
import chaiHttp from "chai-http";
import rimraf from "rimraf";
import dbHandler from "../src/db-handler";
import server from "../src/server";
import BatchController, {
  manageExpiry,
} from "../src/modules/batch/batch.controller";
import Mongoose from "mongoose";
import spies from "chai-spies";
import BatchModel from "../src/modules/batch/batch.model";

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
  });

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

  it("Determines the available batches", (done: any) => {
    chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res) => {
        const userID = res.body.id;
        return BatchController.determineAvailableBatches(
          userID,
          dummyJobId,
          mockJob.numLabellersRequired
        );
      })
      .then((res) => {
        expect(res.length).to.equal(1);
        expect(res[0].job.equals(dummyJobId)).to.equal(true);
        done();
      })
      .catch(done);
  });

  it("Return null if no available batches was found", (done: any) => {
    const badID: any = "4edd40c86762e0fb12000003";
    chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res) => {
        const userID = res.body.id;
        return BatchController.determineAvailableBatches(
          userID,
          Mongoose.Types.ObjectId(badID),
          mockJob.numLabellersRequired
        );
      })
      .then((res) => {
        expect(res.length).to.equal(0);

        done();
      })
      .catch(done);
  });
});

describe("Find complete batch and images", () => {
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
  });

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

  it("Retrieves one batch and the images with the correct id", (done: any) => {
    chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res1) => {
        const mockBatch = res1.body[0];
        return chai
          .request(server)
          .get(endpoint + "/" + mockBatch._id)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res2) => {
        expect(res2).to.have.status(200);
        expect(res2).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        const body = res2.body;
        expect(body).to.have.property("images");
        expect(body.images.length).to.not.equal(0);
        done();
      })
      .catch(done);
  });

  it("Returns 500 when malformed ID provided", (done: any) => {
    chai
      .request(server)
      .get(endpoint + "/" + "badID")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res) => {
        expect(res.status).to.equal(500);
        done();
      })
      .catch(done);
  });

  it("Returns 404 is no batch with ID was found", (done: any) => {
    chai
      .request(server)
      .get(endpoint + "/" + "4edd40c86762e0fb12000003")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)

      .then((res2) => {
        expect(res2).to.have.status(404);

        done();
      })
      .catch(done);
  });
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
  });

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
  });

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
      .set("Authorization", "Bearer " + userToken)
      .then((res1) => {
        const mockBatch = res1.body[0];
        return chai
          .request(server)
          .put(endpoint + "/labeller/" + mockBatch._id)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res2) => {
        expect(res2.status).to.equal(200);
        expect(res2.body.labellers.length).to.equal(1);
        expect(res2.body.labellers[0].completed).to.equal(false);
        done();
      })
      .catch(done);
  });

  it("Returns 400 when request body is malformed", (done: any) => {
    // create mock request response and next objects
    const mockReq: any = {};

    const mockRes: any = {
      status: (statusCode: number) => {
        return mockRes;
      },
      send: () => {},
    };
    const next = () => {};

    // spy on the functions inside the dummy response object
    const spy = chai.spy.on(mockRes, "status");

    BatchController.addLabeller(mockReq, mockRes, next)
      .then((res) => {
        expect(spy).to.have.been.called.with(400);
        done();
      })
      .catch(done);
  });

  it("Returns 404 when wrong objectID used", (done: any) => {
    function status(statusCode: any) {
      return mockRes;
    }
    const mockReq: any = {
      body: {
        userId: mockUserID,
      },
      params: {
        batch: Mongoose.Types.ObjectId("4edd40c86762e0fb12000003"),
      },
    };
    const mockRes: any = {
      status: status,
      send: () => {},
    };
    const next = () => {};
    const spy = chai.spy.on(mockRes, "status");
    BatchController.addLabeller(mockReq, mockRes, next)
      .then((res) => {
        expect(spy).to.have.been.called.with(404);
        done();
      })
      .catch(done);
  });

  it("Returns 404 when bad objectID used", (done: any) => {
    function status(statusCode: any) {
      return mockRes;
    }
    const mockReq: any = {
      body: {
        userId: mockUserID,
      },
      params: {
        batch: "BadID",
      },
    };
    const mockRes: any = {
      status: status,
      send: () => {},
    };
    const next = () => {};
    const spy = chai.spy.on(mockRes, "status");
    BatchController.addLabeller(mockReq, mockRes, next)
      .then((res) => {
        expect(spy).to.have.been.called.with(404);
        done();
      })
      .catch(done);
  });
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
  });

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
  });

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
      .set("Authorization", "Bearer " + userToken)
      .then((res1) => {
        mockBatch = res1.body[0];
        return chai
          .request(server)
          .put(endpoint + "/labeller/" + mockBatch._id)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res2) => {
        return chai
          .request(server)
          .delete(endpoint + "/labeller/" + mockBatch._id)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res3) => {
        expect(res3.status).to.equal(204);
        done();
      })
      .catch(done);
  });
});

describe("Find next batch", () => {
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
  });

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

  it("Retrieves batch when available", (done: any) => {
    chai
      .request(server)
      .get(endpoint + "/next/" + dummyJobId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res1) => {
        expect(res1.status).to.equal(200);
        const body = res1.body;
        expect(body.job).to.equal(dummyJobId);

        done();
      })
      .catch(done);
  });

  it("Retrieves no batch when not available", (done: any) => {
    chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res1) => {
        const mockBatch = res1.body[0];
        return chai
          .request(server)
          .put(endpoint + "/labeller/" + mockBatch._id)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res2) => {
        return chai
          .request(server)
          .get(endpoint + "/next/" + dummyJobId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res3) => {
        expect(res3.status).to.equal(200);
        const body = res3.body;
        expect(body).to.equal("No Batch");

        done();
      })
      .catch(done);
  });

  it("Returns 400 if finding next batch went wrong", (done: any) => {
    chai
      .request(server)
      .get(endpoint + "/next/" + "4edd40c86762e0fb12000003")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res1) => {
        expect(res1.status).to.equal(404);
        done();
      })
      .catch(done);
  });
});

describe("Batch expiry", () => {
  const endpoint = "/api/batch/";

  // dummy data
  let userToken = "";
  let userId: string;

  let dummyJobId: any;
  let dummyBatchId: string;
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
  };

  before(async function () {
    await dbHandler.connect();
  });

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

    // get the user id
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

    // add an image to this job - will create a batch
    await chai
      .request(server)
      .post("/api/images")
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", dummyJobId)
      .attach("image", "tests/test_image/png.png");

    // get the batch id
    res = await chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken);

    dummyBatchId = res.body[0]._id;

    // accept the batch - will set the expiry time
    res = await chai
      .request(server)
      .put(endpoint + "/labeller/" + dummyBatchId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken);
  });
  // disconnect from in-memory db
  after(async function () {
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
    await dbHandler.close();
  });

  afterEach(async () => {
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
  });

  it("Removes expired", (done: any) => {
    // update the expiry time to 5 days ago
    const newExpiryTime = new Date();
    newExpiryTime.setTime(newExpiryTime.getTime() - 5 * 24 * 60 * 60 * 1000);

    BatchModel.find()
      .then(async (batches: any) => {
        // loop through all the batches
        for (let batch of batches) {
          // update the batch expiry time
          for (let labeller of batch.labellers) {
            labeller.expiry = newExpiryTime;
          }

          await batch.save();
        }
      })
      .then((res: any) => {
        // now batch expiry times are updated
        // call manageExiry() - it should remove the user as a labeller
        return manageExpiry();
      })
      .then((res: any) => {
        return chai
          .request(server)
          .get(endpoint)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // loop through all the batches
        for (let batch of res.body) {
          // the labellers should be empty
          expect(batch.labellers).deep.equal([]);
        }
      })
      .then(done)
      .catch(done);
  });

  it("Leaves unexpired", (done: any) => {
    // now batch expiry times are updated
    // call manageExiry() - it should NOT remove the user as a labeller
    manageExpiry()
      .then((res: any) => {
        return chai
          .request(server)
          .get(endpoint)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // loop through all the batches
        for (let batch of res.body) {
          // the labellers should only be the current user
          for (let labeller of batch.labellers) {
            expect(labeller).to.have.property("labeller", userId);
          }
        }
      })
      .then(done)
      .catch(done);
  });

  it("Leaves expired, but completed", (done: any) => {
    // update the expiry time to 5 days ago
    const newExpiryTime = new Date();
    newExpiryTime.setTime(newExpiryTime.getTime() - 5 * 24 * 60 * 60 * 1000);

    BatchModel.find()
      .then(async (batches: any) => {
        // loop through all the batches
        for (let batch of batches) {
          // update the batch expiry time
          for (let labeller of batch.labellers) {
            labeller.completed = true;
            labeller.expiry = newExpiryTime;
          }

          await batch.save();
        }
      })
      .then((res: any) => {
        // now batch expiry times are updated
        // call manageExiry() - it should remove the user as a labeller
        return manageExpiry();
      })
      .then((res: any) => {
        return chai
          .request(server)
          .get(endpoint)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: any) => {
        // loop through all the batches
        for (let batch of res.body) {
          // the labellers should only be the current user
          for (let labeller of batch.labellers) {
            expect(labeller).to.have.property("labeller", userId);
          }
        }
      })
      .then(done)
      .catch(done);
  });

  it("Returns expiry time for a user", (done: any) => {
    let expiryTime: string;

    BatchModel.findById(dummyBatchId)
      .then((batch: any) => {
        // get the correct user
        for (let labeller of batch.labellers) {
          if (String(labeller.labeller) === String(userId)) {
            // we have found us
            // return the associated expiry time
            expiryTime = labeller.expiry.toISOString();
          }
        }

        return chai
          .request(server)
          .get(endpoint + "/expiry/" + dummyBatchId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res: ChaiHttp.Response) => {
        // get the expiry time from this
        expect(res).to.have.status(200);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;

        expect(res.body).to.have.property("expiry", expiryTime);

        done();
      })
      .catch(done);
  });

  it("Returns unauthorised for a non-labeller", (done: any) => {
    // create a dummy user
    chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send({
        firstName: "Some",
        surname: "One",
        email: "someone@example.com1",
        password: "someHash",
      })
      .then((res: ChaiHttp.Response) => {
        // get the user token
        return chai
          .request(server)
          .get(endpoint + "/expiry/" + dummyBatchId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + res.body.token);
      })
      .then((res: ChaiHttp.Response) => {
        // get the expiry time from this
        expect(res).to.have.status(401);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;

        expect(res.body).to.have.property(
          "message",
          "User is not a labeller for this batch"
        );

        done();
      })
      .catch(done);
  });

  it("Returns Not Found for an incorrect batch id", (done: any) => {
    const wrongId = dummyBatchId.slice(1) + "f";
    chai
      .request(server)
      .get(endpoint + "/expiry/" + wrongId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res: ChaiHttp.Response) => {
        // get the expiry time from this
        expect(res).to.have.status(404);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;

        expect(res.body).to.have.property(
          "message",
          "Batch not found with id " + wrongId
        );

        done();
      })
      .catch(done);
  });

  it("Returns Not Found for an invalid batch id", (done: any) => {
    const wrongId = dummyBatchId + "f";
    chai
      .request(server)
      .get(endpoint + "/expiry/" + wrongId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res: ChaiHttp.Response) => {
        // get the expiry time from this
        expect(res).to.have.status(422);
        expect(res).to.have.header(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        expect(res).to.be.json;

        expect(res.body).to.have.property(
          "message",
          "Malformed batch id " + wrongId
        );

        done();
      })
      .catch(done);
  });
});

describe("Complete a batch", () => {
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
  });

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

  it("Completes batch", (done: any) => {
    let batchID: any;

    chai
      .request(server)
      .get(endpoint + "/next/" + dummyJobId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res1) => {
        batchID = res1.body._id;
        return chai
          .request(server)
          .put(endpoint + "/labeller/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res2) => {
        return chai
          .request(server)
          .put(endpoint + "/complete/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res3) => {
        expect(res3.status).to.equal(204);
        done();
      })
      .catch(done);
  });

  it("Returns 404 when batchID not found", (done: any) => {
    chai
      .request(server)
      .put(endpoint + "/complete/" + "4edd40c86762e0fb12000003")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res) => {
        expect(res.status).to.equal(404);
        done();
      })
      .catch(done);
  });
});

describe("Update the user reward", () => {
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
  });

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

  it("Updates reward", (done: any) => {
    let batchID: any;

    chai
      .request(server)
      .get(endpoint + "/next/" + dummyJobId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res1) => {
        batchID = res1.body._id;
        return chai
          .request(server)
          .put(endpoint + "/labeller/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res2) => {
        return chai
          .request(server)
          .put(endpoint + "/complete/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res3) => {
        return chai
          .request(server)
          .put(endpoint + "/reward/" + dummyJobId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res4) => {
        expect(res4.status).to.equal(204);
        done();
      })
      .catch(done);
  });

  const badID: any = "4edd40c86762e0fb12000003";
  it("Returns 404 when jobID not found", (done: any) => {
    let batchID: any;

    chai
      .request(server)
      .get(endpoint + "/next/" + dummyJobId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res1) => {
        batchID = res1.body._id;
        return chai
          .request(server)
          .put(endpoint + "/labeller/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res2) => {
        return chai
          .request(server)
          .put(endpoint + "/complete/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res3) => {
        return chai
          .request(server)
          .put(endpoint + "/reward/" + badID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res4) => {
        expect(res4.status).to.equal(404);
        done();
      })
      .catch(done);
  });
});

describe("Finding progress", () => {
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
  });

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

  it("Finds the progress", (done: any) => {
    let batchID: any;

    chai
      .request(server)
      .get(endpoint + "/next/" + dummyJobId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res1) => {
        batchID = res1.body._id;
        return chai
          .request(server)
          .put(endpoint + "/labeller/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res2) => {
        return chai
          .request(server)
          .put(endpoint + "/complete/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res3) => {
        return chai
          .request(server)
          .get(endpoint + "/progress/" + dummyJobId)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res4) => {
        expect(res4.status).to.equal(200);
        done();
      })
      .catch(done);
  });

  const badID: any = "4edd40c86762e0fb12000003";
  it("Returns 404 when jobID not found", (done: any) => {
    let batchID: any;

    chai
      .request(server)
      .get(endpoint + "/next/" + dummyJobId)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .then((res1) => {
        batchID = res1.body._id;
        return chai
          .request(server)
          .put(endpoint + "/labeller/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res2) => {
        return chai
          .request(server)
          .put(endpoint + "/complete/" + batchID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res3) => {
        return chai
          .request(server)
          .get(endpoint + "/progress/" + badID)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken);
      })
      .then((res4) => {
        expect(res4.status).to.equal(404);
        done();
      })
      .catch(done);
  });
});
