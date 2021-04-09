import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// real database connection
const dbConnectionString = "mongodb://localhost/jinx";

let mongod: MongoMemoryServer;

// you may stop mongod manually
// await mongod.stop();

// even you forget to stop `mongod` when you exit from script
// special childProcess killer will shutdown it for you

// connect to the db: if env is test, connect to mongod instead (tests won't affect real db)
async function connect(): Promise<void> {
  let uri: string;
  if (process.env.NODE_ENV !== "test") {
    uri = dbConnectionString;
  } else {
    mongod = new MongoMemoryServer();
    uri = await mongod.getUri();
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  });

  // make mongoose use normal promise library
  mongoose.Promise = global.Promise;

  console.log(`Connected to database at ${uri}`);
}

// close the db. If in a test env, using mongod so make sure db is dropped as well
async function close(): Promise<void> {
  if (process.env.NODE_ENV === "test") await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (process.env.NODE_ENV === "test") await mongod.stop();

  console.log("Disconnected database");
}

// only empty the db if in test mode, becase then using mongod and not real db
async function clear(): Promise<void> {
  if (process.env.NODE_ENV !== "test") return;

  const collections = mongoose.connection.collections;

  for (let collection in collections) {
    await collections[collection].deleteMany({});
  }

  // console.log("Emptied database");
}

// make functions available when imported
export default { connect, close, clear };
