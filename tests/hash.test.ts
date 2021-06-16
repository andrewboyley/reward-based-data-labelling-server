import chai from "chai";
import chaiHttp from "chai-http";

import hash from "../src/hash";

const expect = chai.expect;

chai.use(chaiHttp);

describe("Testing hashing helper", () => {
  // check that a hashed sting is returned
  it("hashes a password", (done: any) => {
    hash.hashPassword("hello", (hashedString: string) => {
      expect(hashedString).to.not.be.equal("");
      done();
    });
  });

  it("can recognise a password", (done: any) => {
    // check that can recognise a hash
    const password = "hello";
    hash.hashPassword(password, (hashedPassword: string) => {
      hash.comparePassword(password, hashedPassword, (result: boolean) => {
        expect(result).to.be.true;
        done();
      });
    });
  });

  it("can recognise an incorrect password", (done: any) => {
    // check that rejects an invlaid password - hashes won't match
    const password = "hello";
    hash.hashPassword(password, (hashedPassword: string) => {
      hash.comparePassword(
        password + "q",
        hashedPassword,
        (result: boolean) => {
          expect(result).to.be.false;
          done();
        }
      );
    });
  });
});
