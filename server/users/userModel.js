const Q = require('q');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');

const SALT_WORK_FACTOR = 10;
const Schema = mongoose.Schema;

mongoose.Promise = Q.Promise;

/** Mongo Database Connection */
mongoose.connect('mongodb://localhost/HackerWords');

mongoose.connection.on('open', () => {
  console.log('mongoose connection opened');
});

mongoose.connection.on('disconnected', () => {
  console.log('mongoose connection closed');
});


/** User Schema */
const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  salt: String,
});


// A case not to use arrow functions: since arrow functions have
// anonymous 'this' so they can carry the 'this' from outside their
// scope - we don't be able to access the user if we use it.

/** Compare provided password at signin and cross-check with password stored in database */
userSchema.methods.comparePasswords = function (candidatePassword) {
  const savedPassword = this.password;
  return new Q.Promise((resolve, reject) => {
    bcrypt.compare(candidatePassword, savedPassword, (err, isMatch) => {
      console.log('Error: ', err);
      console.log('Passwards match?: ', isMatch);
      if (err) {
        reject(err);
      } else {
        resolve(isMatch);
      }
    });
  });
};


// A case not to use arrow functions: since arrow functions have
// anonymous 'this' so they can carry the 'this' from outside their
// scope - we don't be able to access the user if we use it.

/** Before saving the user to the database */
userSchema.pre('save', function (next) {
  const user = this;

  /** Only hash the password if it has been modified (or is new) */
  if (!user.isModified('password')) {
    next();
    return;
  }

  /** Generate a salt */
  bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) => {
    if (err) {
      next(err);
      return;
    }

    /** Hash the password along with our new salt */
    bcrypt.hash(user.password, salt, null, (error, hash) => {
      if (error) {
        next(error);
        return;
      }

      /** Override the cleartext password with the hashed one */
      user.password = hash;
      user.salt = salt;
      next();
    });
  });
});


const User = mongoose.model('User', userSchema);
module.exports = User;
