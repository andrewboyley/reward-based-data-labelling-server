// process.env.NODE_ENV = "test";

// import fs - test image uploads
import fs from "fs";
import path from "path";

import chai from "chai";
import chaiHttp from "chai-http";
import rimraf from "rimraf";
import dbHandler from "../src/db-handler";
import server from "../src/server";
import ItemController, {
  determineSortedImageLabels,
} from "../src/modules/LabelledItem/item.controller";
import Mongoose from "mongoose";

const expect = chai.expect;

chai.use(chaiHttp);

describe("POST /images - upload image", () => {
  const endpoint = "/api/images";

  // keep track of job and user
  let jobID: string;
  let userToken: string;

  // dummy user
  const userInsert: any = {
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

    // create user
    let res: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(userInsert);

    // get the user token
    userToken = res.body.token;

    // create a dummy job
    const jobInsert: any = {
      title: "A second job",
      description: "Another job description",
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
    };

    res = await chai
      .request(server)
      .post("/api/job/")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(jobInsert);

    jobID = res.body._id;
  });

  // disconnect from in-memory db
  after(async function () {
    rimraf.sync(__dirname + "/../uploads/jobs/" + jobID);
    await dbHandler.close();
  });

  it("save png image in uploads folder", (done: any) => {
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", jobID)
      .attach("image", "tests/test_image/png.png")
      .end(function (err: any, res: ChaiHttp.Response) {
        // check that the image has been uploaded
        expect(err).to.be.null;
        expect(res.status).to.equal(200);
        rimraf.sync(__dirname + "/../uploads/jobs/" + jobID);
        done();
      });
  });

  it("save jpg image in uploads folder", (done: any) => {
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", jobID)
      .attach("image", "tests/test_image/jpg.jpg")
      .end(function (err: any, res: ChaiHttp.Response) {
        // check the image has been uploaded
        expect(err).to.be.null;
        expect(res.status).to.equal(200);
        rimraf.sync(__dirname + "/../uploads/jobs/" + jobID);

        done();
      });
  });
});

describe("GET /images - find images", () => {
  const endpoint = "/api/images";

  // keep track of job and user
  let jobID: string;
  let userToken: string;

  // dummy user
  const userInsert: any = {
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

    // create user
    let res: ChaiHttp.Response = await chai
      .request(server)
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .send(userInsert);

    // get the user token
    userToken = res.body.token;

    const jobInsert: any = {
      title: "A second job",
      description: "Another job description",
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
    };

    res = await chai
      .request(server)
      .post("/api/job/")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(jobInsert);

    jobID = res.body._id;
  });

  // disconnect from in-memory db
  after(async function () {
    rimraf.sync(__dirname + "/../uploads/jobs/" + jobID);

    await dbHandler.close();
  });

  it("retrieves all job images", (done: any) => {
    // upload image
    chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", jobID)
      .attach("image", "tests/test_image/png.png")
      .end(function (err: any, res: ChaiHttp.Response) {
        // retrieve image
        chai
          .request(server)
          .get(endpoint)
          .set("Content-Type", "application/json; charset=utf-8")
          .query({ jobID: jobID })
          .end((err: any, res: ChaiHttp.Response) => {
            // verify have image
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body).to.have.lengthOf(1);
            const body = res.body[0];
            expect(body).to.have.property("_id");
            expect(body).to.have.property("labels");
            expect(body).to.have.property("value");
            expect(body["value"]).to.not.equal("");
            expect(body).to.have.property("job", jobID);

            // remove test image
            rimraf("uploads/jobs/" + jobID, function () {
              console.log("Removed test image");
            });
            done();
          });
      });
  });
});

describe("PUT /images", () => {
  const endpoint = "/api/images/";

  // dummy data
  let userToken = "";
  let userId: string;
  let dummyJobId: string;
  let imageId: string;

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
    // convert the token to an id
    res = await chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send();

    userId = res.body.id;

    dataInsert = {
      title: "Some title",
      description: "Some description",
      //date created does not need to be inserted because it is not changable by user
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
    };

    // create this job to create the batches
    res = await chai
      .request(server)
      .post("/api/job")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(dataInsert);

    dummyJobId = res.body._id;
    // mockJob = res.body;

    // upload an image to the job we have just created
    res = await chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", dummyJobId)
      .attach("image", "tests/test_image/png.png");

    // get the image id we have just uploaded
    res = await chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .query({ jobID: dummyJobId });

    imageId = res.body[0]._id;
  });

  // disconnect from in-memory db
  after(async function () {
    await dbHandler.close();
  });

  afterEach(async function () {
    // remove the image we uploaded
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
  });

  it("correctly adds a new label - none previously exist", async () => {
    const labels = ["one", "two"];

    const data: any = { labels: labels };

    let res: ChaiHttp.Response = await chai
      .request(server)
      .put(endpoint + "/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(data); // attach payload

    // expect to return 201, with the new labels
    expect(res.status).to.equal(201);
    expect(res.body).deep.equal(labels);

    // check that the labels have actually been added to this image
    res = await chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .query({ jobID: dummyJobId });

    // check the labellers
    expect(res.body[0]).to.have.property("labels"); // check labels exist
    expect(res.body[0].labels[0]).to.have.property("labeller", userId); // check that may labels are here
    expect(res.body[0].labels[0]).to.have.property("value"); // confirm labels exist
    expect(res.body[0].labels[0].value).deep.equal(labels); // check that they are my labels
  });

  it("correctly adds a new label - previously exists", async () => {
    const labels = ["one", "two"];

    let data: any = { labels: [labels[0]] };

    // add one label
    let res: ChaiHttp.Response = await chai
      .request(server)
      .put(endpoint + "/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(data); // attach payload

    // add second label
    data = { labels: labels };
    res = await chai
      .request(server)
      .put(endpoint + "/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(data); // attach payload

    // expect to return 201, with the new labels
    expect(res.status).to.equal(201);
    expect(res.body).deep.equal(labels);

    // check that the labels have actually been added to this image
    res = await chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .query({ jobID: dummyJobId });

    // check the labellers
    expect(res.body[0]).to.have.property("labels"); // check labels exist
    expect(res.body[0].labels[0]).to.have.property("labeller", userId); // check that may labels are here
    expect(res.body[0].labels[0]).to.have.property("value"); // confirm labels exist
    expect(res.body[0].labels[0].value).deep.equal(labels); // check that they are my labels
  });

  it("correctly changes the labels", async () => {
    const labels = ["one", "two"];

    let data: any = { labels: [labels[0]] };

    // add one label
    let res: ChaiHttp.Response = await chai
      .request(server)
      .put(endpoint + "/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(data); // attach payload

    // add second label
    data = { labels: [labels[1]] };
    res = await chai
      .request(server)
      .put(endpoint + "/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(data); // attach payload

    // expect to return 201, with the new labels
    expect(res.status).to.equal(201);
    expect(res.body).deep.equal([labels[1]]);

    // check that the labels have actually been added to this image
    res = await chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .query({ jobID: dummyJobId });

    // check the labellers
    expect(res.body[0]).to.have.property("labels"); // check labels exist
    expect(res.body[0].labels[0]).to.have.property("labeller", userId); // check that may labels are here
    expect(res.body[0].labels[0]).to.have.property("value"); // confirm labels exist
    expect(res.body[0].labels[0].value).deep.equal([labels[1]]); // check that they are my labels
  });

  it("does not duplicate labels per user", async () => {
    const labels = ["one", "two"];

    let data: any = { labels: labels };

    // add labels
    let res: ChaiHttp.Response = await chai
      .request(server)
      .put(endpoint + "/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(data); // attach payload

    // add same labels again
    res = await chai
      .request(server)
      .put(endpoint + "/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(data); // attach payload

    // expect to return 201, with the new labels
    expect(res.status).to.equal(201);
    expect(res.body).deep.equal(labels);

    // check that the labels have actually been added to this image
    res = await chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .query({ jobID: dummyJobId });

    // check the labellers
    expect(res.body[0]).to.have.property("labels"); // check labels exist
    expect(res.body[0].labels).to.have.length(1); // only one set of labels should exist for me
    expect(res.body[0].labels[0]).to.have.property("labeller", userId); // check that may labels are here
    expect(res.body[0].labels[0]).to.have.property("value"); // confirm labels exist
    expect(res.body[0].labels[0].value).deep.equal(labels); // check that they are my labels, without duplicates
  });

  it("handles invalid image id", async () => {
    const labels = ["one", "two"];
    const wrongId = imageId + "f";

    let data: any = { labels: labels };

    // add labels
    let res: ChaiHttp.Response = await chai
      .request(server)
      .put(endpoint + "/" + wrongId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(data); // attach payload

    expect(res.status).to.equal(404);
    expect(res.body).to.have.property(
      "message",
      "Image not found with id " + wrongId
    );
  });

  it("handles invalid labels", async () => {
    const labels = [[1, 2]];

    let data: any = { labels: labels };

    // add labels
    let res: ChaiHttp.Response = await chai
      .request(server)
      .put(endpoint + "/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(data); // attach payload

    expect(res.status).to.equal(422);
    expect(res.body).to.have.property("message");
    expect(res.body.message).to.include("LabelledItem validation failed");
  });
});

describe("Image utility functions", () => {
  const endpoint = "/api/images/";

  // dummy data
  let userToken = "";
  let userId: string;
  let dummyJobId: string;
  let imageId: string;
  let imageData: any;

  const user: any = {
    firstName: "Some",
    surname: "One",
    email: "someone@example.com",
    password: "someHash",
  };

  const labels = ["one", "two"];

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
    // convert the token to an id
    res = await chai
      .request(server)
      .get("/api/auth/id")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send();

    userId = res.body.id;

    dataInsert = {
      title: "Some title",
      description: "Some description",
      //date created does not need to be inserted because it is not changable by user
      numLabellersRequired: 2,
      labels: ["A"],
      reward: 1,
    };

    // create this job to create the batches
    res = await chai
      .request(server)
      .post("/api/job")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send(dataInsert);

    dummyJobId = res.body._id;

    // upload an image to the job we have just created
    res = await chai
      .request(server)
      .post(endpoint)
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", "Bearer " + userToken)
      .field("jobID", dummyJobId)
      .attach("image", "tests/test_image/png.png");

    // get the image id we have just uploaded
    res = await chai
      .request(server)
      .get(endpoint)
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .query({ jobID: dummyJobId });

    imageId = res.body[0]._id;
    imageData = res.body[0];

    // add a label to the image
    res = await chai
      .request(server)
      .put(endpoint + "/" + imageId) // label this image
      .set("Content-Type", "application/json; charset=utf-8")
      .set("Authorization", "Bearer " + userToken)
      .send({ labels: labels }); // attach payload
  });

  // disconnect from in-memory db
  after(async function () {
    await dbHandler.close();
  });

  afterEach(async function () {
    // remove the image we uploaded
    rimraf.sync(__dirname + "/../uploads/jobs/" + dummyJobId);
  });

  it("finds images in a batch", async () => {
    // check that we return images from this batch
    let images: any = await ItemController.findImagesInBatch(
      Mongoose.Types.ObjectId(dummyJobId),
      imageData.batchNumber
    );

    for (let image of images) {
      // check that each image has the correct job id and batch number
      expect(image).to.have.property("job");
      expect(String(image.job)).to.equal(dummyJobId);
      expect(image).to.have.property("batchNumber", imageData.batchNumber);
    }
  });

  it("removes user labels", async () => {
    // check that we return images from this batch
    let result: any = await ItemController.removeUserLabels(
      Mongoose.Types.ObjectId(dummyJobId),
      imageData.batchNumber,
      Mongoose.Types.ObjectId(userId)
    );

    expect(result).to.equal(true);

    // get images from this batch
    result = await ItemController.findImagesInBatch(
      Mongoose.Types.ObjectId(dummyJobId),
      imageData.batchNumber
    );

    for (let image of result) {
      // check each image has no labellers which are me
      expect(image).to.have.property("labels");
      for (let label of image.labels) {
        expect(label).to.have.property("labeller");
        expect(String(label.labeller)).to.not.equal(userId);
      }
    }
  });

  it("sorts the image labels by frequency", (done: any) => {
    // const labels = ["one", "two"];

    // create 2 new users and assign labels to the images
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
        // do the update with this user
        return chai
          .request(server)
          .put(endpoint + "/" + imageId) // label this image
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + res.body.token)
          .send({ labels: [labels[1]] }); // attach payload
      })
      .then((res: ChaiHttp.Response) => {
        // do the second user
        return chai
          .request(server)
          .post("/api/auth/register")
          .set("Content-Type", "application/json; charset=utf-8")
          .send({
            firstName: "Some",
            surname: "One",
            email: "someone@example.com2",
            password: "someHash",
          });
      })
      .then((res: ChaiHttp.Response) => {
        return chai
          .request(server)
          .put(endpoint + "/" + imageId) // label this image
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + res.body.token)
          .send({ labels: labels });
      })
      .then((res: ChaiHttp.Response) => {
        // now the image has been labelled by 3 different users

        // get the image
        return chai
          .request(server)
          .get(endpoint)
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + userToken)
          .query({ jobID: dummyJobId });
      })
      .then((res: ChaiHttp.Response) => {
        // labels[0] has two occurance
        // labels[1] has three occurrances

        const sortedLabelsDesired = [labels[1], labels[0]];
        const sortedLabelsActual = determineSortedImageLabels(res.body[0]);

        expect(sortedLabelsActual).deep.equal(sortedLabelsDesired);
        done();
      })
      .catch(done);
  });

  it("'assigns' the correct labels to all the images in a job", (done: any) => {
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
        // do the update with this user
        return chai
          .request(server)
          .put(endpoint + "/" + imageId) // label this image
          .set("Content-Type", "application/json; charset=utf-8")
          .set("Authorization", "Bearer " + res.body.token)
          .send({ labels: [labels[1]] }); // attach payload
      })
      .then((res: ChaiHttp.Response) => {
        // now the image has been labelled by 2 different users

        // perform the 'labelling'
        return ItemController.determineImageLabelsInJob(
          Mongoose.Types.ObjectId(dummyJobId)
        );
      })
      .then((res: any) => {
        // res is going to be an array of the images - we will only have one
        res = res[0];

        // labels[1] will have two occurrances
        // labels[0] will have one occurrance

        const assignedLabelsDesired = [labels[1], labels[0]];

        expect(res).to.have.property("assignedLabels");
        expect(res.assignedLabels).deep.equal(assignedLabelsDesired);
        expect(res).to.not.have.property("labels");

        done();
      })
      .catch(done);
  });
});
