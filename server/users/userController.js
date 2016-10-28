const Q = require('q');
const jwt = require('jwt-simple');
const User = require('./userModel.js');
const Game = require('./../board/GameModel.js');
const util = require('./../util.js');
// Promisify a few mongoose methods with the `q` promise library
const findUser = Q.nbind(User.findOne, User);
const createUser = Q.nbind(User.create, User);

module.exports = {

  /** Get all users from database */
  getAllUsers(req, res, next) {
    User.find({}, (err, result) => {
      const allUsers = result.map(userEntry => (userEntry.username));
      res.json({ allUsers });
    });
  },

  /** Get highest score of currently signed in user */
  getUserHighScore(req, res, next) {
    const username = req.url.split('=')[1];
     util.getUserIDFromUsername(username, (userID) => {
      Game.find({user_id: userID}, (err, result) => {
        let highestScore = 0;
        result.forEach(function(game) {
          if (game.points > highestScore) {
            highestScore = game.points;
            console.log(highestScore);
          }
        });
        res.json({ highestScore });
      });
     });
  },

  /** Get all pending game challenges */
  getPendingGames(req, res, next) {
    const username = req.body.username;
    console.log('PENDING USERNAME', username);
    util.getUserIDFromUsername(username, (userID) => {
      console.log('PENDING USER ID', userID);
      const query = { user_id: userID, pending: true };
      Game.find(query, (err, result) => {
        console.log('PENDING RESULT', result);
        res.json({ result });
      });
    });

    /*
    const username = req.body.username;
    const query = { username: username, pending: true };
    Game.find(query, (result) => {
      res.json({ result });
    });
    */
  },

  /** Signin a user if user exists in database and passwords match */
  signin(req, res, next) {
    console.log('signin in');
    const username = req.body.username;
    const password = req.body.password;

    findUser({ username })
      .then((user) => {
        if (!user) {
          return next(new Error('User does not exist'));
        }
        return user.comparePasswords(password)
          .then((foundUser) => {
            if (foundUser) {
              const token = jwt.encode(user, 'secret');
              return res.json({ token });
            }
            return next(new Error('Wrong password'));
          });
      })
      .fail((error) => {
        next(error);
      });
  },

  /** Signup a user if username doesn't exist in database */
  signup(req, res, next) {
    const username = req.body.username;
    const password = req.body.password;

    /** Check to see if username exists already */
    findUser({ username })
      .then((user) => {
        if (user) {
          return next(new Error('User already exist!'));
        }

        /** Make a new user entry in database if username doesn't exist */
        return createUser({
          username,
          password,
        });
      })
      .then((user) => {

        /** Create a session token and send back for authorization */
        const token = jwt.encode(user, 'secret');
        res.json({ token });
      })
      .fail((error) => {
        next(error);
      });
  },

  /** Check to see if the user is authenticated */
  checkAuth(req, res, next) {

    /** Grab the token in the header, if any */
    console.log('HEADERS =', req.headers);
    const token = req.headers['x-access-token'];
    if (!token) {
      next(new Error('No token'));
    } else {

      /** Decode the token */
      const user = jwt.decode(token, 'secret');

      /** Check to see if that user exists in the database and respond with right status code */
      findUser({ username: user.username })
        .then((foundUser) => {
          if (foundUser) {
            res.send(200);
          } else {
            res.send(401);
          }
        })
        .fail((error) => {
          next(error);
        });
    }
  },
};
