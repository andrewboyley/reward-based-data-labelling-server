import bcrypt from "bcrypt";

// set the number of salt rounds
const saltRounds = 10;

// hash a plaintext password and call the callback function, passing it the hash
function hashPassword(password: string, next: hashPasswordNext): void {
  // generate salt
  bcrypt.genSalt(saltRounds).then((salt: string) => {
    // hash password with salt
    bcrypt.hash(password, salt).then((hash: string) => {
      // callback call
      next(hash);
    });
  });
}

// compare a plaintext password to a hash and see if they match
function comparePassword(
  password: string,
  hashedPassword: string,
  next: compareHashNext
) {
  bcrypt.compare(password, hashedPassword).then((result: boolean) => {
    // This will be either true or false, based on if the string matches or not.

    // callback call
    next(result);
  });
}

export default { hashPassword, comparePassword };
export interface hashPasswordNext {
  (hash: string): void;
}
export interface compareHashNext {
  (doMatch: boolean): void;
}

// https://dev.to/aditya278/understanding-and-implementing-password-hashing-in-nodejs-2m84
