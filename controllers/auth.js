var mongoose = require('mongoose');
var restify  = require('restify');
var path = require('path');
var bcrypt = require('bcrypt-nodejs');
var User = mongoose.model('user');
var bodyParser = require('body-parser');
var Response = require('../helpers/response.js');
var errors = require('../helpers/errors.js');
var common = require('../helpers/common.js');
var notifications = require('./notifications.js');

//User Signup
exports.signup = function (req, res, next) {
  var registeringUser = req.params.user;
  console.log("got data");
  if(typeof registeringUser.phone == 'undefined' || registeringUser.phone == ''){
    res.status(400).send('phone is missing');
    return next();
  } else {
    var phone = registeringUser.phone;
    if(phone.substr(0, 3) != '+91' && phone.split(phone.substr(0, 3))[1].length != 10) {
      res.status(400).send('Phone number should belong to India.');
      return next();
    }
  }

  User.findOne(
     { 'phone': registeringUser.phone }
   ).exec(function(err, existingUser){
     if (err) {
       res.send(new restify.InternalError("Error looking up user"));
       return next();
     }
     User.create(registeringUser, function (err, newUser) {
       if (err) {
         errors.processError(err, req, res);
       } else {
         console.log("creating");
         newUser.createSession(function (err, loggedInUser) {
           if (err) {
             res.send(new restify.InternalError("Error logging in the new user: " + err.message));
             return next();
           } else {
             console.log("added user");
             res.send(200, {newUser: loggedInUser});
             return next();
           }
         });
       }
     });
   });
 }


//Login into app
exports.login = function (req, res, next) {
  debugger;
  var phone = req.body.phone;
  var password = req.body.password;

  createNewSession(phone, password, function (err, user) {
    console.log(user);
    if (err) {
      res.send(new restify.InvalidCredentialsError("Username/Password invalid."));
      return next();
    } else {
      if (user) {
        console.log("login sucess");
        res.send({user: user});
        return next();
      } else {
        res.send(new Response.respondWithData("User not found."));
        return next();
      }
    }
  });
};

var createNewSession = function (phone, password, callback) {
  // Fetch the user from the database
  User
    .findOne({'phone' : phone})
    .exec(function(err, user) {
      // Look up the user
      if (err) {
        if (callback) {
          err.message = "Error finding user profile";
          return callback(err);
        }
      } else if (!user) {
        if (callback) {
          return callback({message: "Invalid username or password"});
        }
      }

      // Compare passwords
      if (user.password != password) {
        // Wrong passwowrd
        return callback({message: "Wrong password"});
      }

      // Authenticated!
      // Create a new session and return the profile
      user.createSession(function(err, loggedInUser) {
        if (err) {
          err.message = "Error saving user data";
          return callback(err);
        }
        // TOOD: Use schema methods (statics) to filter user model
        return callback(null, loggedInUser);
      });
    });
};

//logout of the app
exports.logout = function(req, res, next) {
  req.user.accessToken = '';
  req.user.save(function(err) {
    if (err) {
      return next(new restify.InternalError(err));
    } else {
      console.log("logout success");
      next(res.send(200));
      return next();
    }
  });
 };

//Login with facebook and google
 exports.socialLogin = function(req, res, next){
   var registeringUser = req.body.user;
   console.log("got");
  if(registeringUser.phone == '' || typeof registeringUser.phone == 'undefined'){
    User.findOne({'email': registeringUser.email}, function(err, user){
      if(err) { res.send( new Response.respondWithData('failed', 'Cannot find user')); return next(); }
      if(user){
        if(user.verified == true){
          if(registeringUser.type == 'google'){
            console.log("google");
             if(user.googleId == registeringUser.socialId) {
               console.log("creatng g_");
               user.createSession(function(err, loggedInUser) {
                if(err) { res.send( new Response.respondWithData('failed', 'Cannot cannot create session')); return next(); }
                console.log("log in g+");
                res.send( new Response.respondWithData('success', loggedInUser));
                return next();
              });
              }
             else if(typeof user.googleId == 'undefined' || user.googleId == '') {
               user.googleId == registeringUser.socialId;
               console.log("new g+");
               user.createSocialSession(registeringUser.socialId,'google', function(err, loggedInUser) {
                if(err) { res.send( new Response.respondWithData('failed', 'Cannot cannot create session')); return next(); }
                res.send( new Response.respondWithData('success', loggedInUser));
                return next();
              });
             } else {
               console.log("fail g+");
               res.send( new Response.respondWithData('failed', 'socialId is wrong'));
               return next();
             }
          } else {
            if(user.facebookId == registeringUser.socialId) {
              console.log("fb");
              user.createSession(function(err, loggedInUser) {
               if(err) {res.send( new Response.respondWithData('failed', 'Cannot cannot create session')); return next();}
               console.log("logd in");
               res.send( new Response.respondWithData('success', loggedInUser));
                return next();
              });
            } else if(typeof user.facebookId == 'undefined' || user.facebookId == '') {
              user.facebookId == registeringUser.socialId;
              console.log("new fb");
              user.createSocialSession(registeringUser.socialId,'facebook', function(err, loggedInUser) {
               if(err){ res.send( new Response.respondWithData('failed', 'Cannot cannot create session')); return next();}
               res.send( new Response.respondWithData('success', loggedInUser));
                return next();
             });
            }  else {
              console.log("Wrong fb");
              res.send( new Response.respondWithData('failed', 'socialId is wrong'));
              return next();
            }
          }
        }
      } else {
          res.send( new Response.respondWithData('success','No user found please register'));
          return next();
        }
    });
  }
  else {
    registeringUser.name = registeringUser.email;
    var logname = registeringUser.email;
    registeringUser.name = logname.split("@")[0];

     if(registeringUser.type == 'google'){
    registeringUser.googleId = registeringUser.socialId;
    registeringUser.password = registeringUser.email;
      } else if(registeringUser.type == 'facebook'){
    registeringUser.facebookId = registeringUser.socialId;
    registeringUser.password = registeringUser.email;
    }

    User.findOne({'phone': registeringUser.phone}, function(err, user){
      if(err) { res.send( new Response.respondWithData('failed', 'Cannot lookup')); return next(); }
      if(user){
        res.send( new Response.respondWithData('failed', 'Phone already exists'));
        return next();
      }  else {
          // Check if user with same username *or* phone number already exists
          User.findOne(
            { 'phone': registeringUser.phone }
          ).exec(function(err, existingUser){
            if (err) {
              res.send(new Response.respondWithData("failed","Error looking up user"));
              return next();
            }
            User.create(registeringUser, function (err, newUser) {
              if (err) {
                errors.processError(err, req, res);
              } else {
                newUser.createSession(function (err, loggedInUser) {
                  if (err) {
                    res.send(new Response.respondWithData("failed","Error logging in the new user: " + err.message));
                    return next();
                  } else {
                    res.send(200, {newUser: loggedInUser});
                    return next();
                  }
                });
              }
            });
          });
      }
    });
  }
}

//Updating user profile
exports.updateProfile = function (req, res, next) {
   var user = req.user;
   var data = req.body.user;
   console.log(user +"Got ip" );
  // Check if the updatedProfile is empty
    if (!data || Object.keys(data).length === 0) {
       console.log("Error: Empty or no object sent to update user.");
       res.send(new restify.InvalidArgumentError("failed","Empty or no user data sent to udpate."));
       return next();
       }

    if (typeof data.location !== 'undefined') {
       try {
           user.location = common.formatLocation(data.location);
         } catch (e) {
           console.log("invalid location");
           res.send(new restify.InvalidArgumentError(e.message));
           return next();
         }
     }
   user.update(data, function(err, user) {
     if (err) {
           errors.processError(err, req, res);
       } else {
           console.log("updated!");
           res.send(200, {user: user});
           return next();
         }
     });
 };

 var updateById = function (userId, updates, callback) {
   req.db.mongoose.model("user").findById(userId, function(err, user) {
   Object.keys(updates).forEach(function(item) {
     // Some properties cannot be modified this way
     /* @TODO Should this disallow other properties from being updated?
            *
     var immutableProperties = ['accessToken', 'password];
           if (immutableProperties.indexOf(item) !== -1){
             return;
           }

           // Others can be modified
            */
           user[item] = updates[item];
     });

       user.save(function(err, user) {
         if (callback) {
             callback(err, user);
           } else if (err) {
             return false;
           } else {
             return true;
           }
         });
       });
  };
 exports.updateById = updateById;

//Changing user password
  exports.changePassword = function(req, res, next){
    var incomingUser = req.user;
    var user = req.body.user;
    console.log(incomingUser + "Got user" + user);
    if(incomingUser.password == user.old){
        var oldUser = incomingUser;
        console.log("old" + oldUser);
        oldUser.password = user.new;
        console.log(oldUser.password);
        oldUser.save(function(err, result){
          if(err){
            res.send(new Response.respondWithData('failed', 'Error updating password'));
            return next();
          } else {
            res.send(new Response.respondWithData('success', 'Your password has been changed successfully'));
            return next();
          }
        })
    } else {
      res.send(new restify.InvalidArgumentError('failed', 'Incorrect old password'));
      return next();
    }
  }

//Updating the user settinngs
exports.settingsUpdate = function (req, res, next){
  var user = req.user;
  var data = req.params.user;
  console.log("got ip");

  if (!data || Object.keys(data).length === 0) {
    console.log("Error: Empty or no object sent to update user.");
    res.send(new restify.InvalidArgumentError("Empty or no user data sent to update."));
    return next();
  }

  if (typeof data.location !== 'undefined') {
    try {
      data.location = common.formatLocation(data.location);
    } catch (e) {
      console.log("invalid location");
      res.send(new restify.InvalidArgumentError(e.message));
      return next();
    }
  }

  user.update(data, function(err, user) {
    if (err) {
      errors.processError(err, req, res);
    } else {
      console.log("settings updated"  + user);
      res.send(200, {user: user});
      return next();
    }
  });
};

var updateById = function (userId, updates, callback) {

  req.db.mongoose.model("user").findById(userId, function(err, user) {
    Object.keys(updates).forEach(function(item) {
      // Some properties cannot be modified this way
      /* @TODO Should this disallow other properties from being updated?
       *
      var immutableProperties = ['accessToken', 'password'];
      if (immutableProperties.indexOf(item) !== -1){
        return;
      }

      // Others can be modified
       */
      user[item] = updates[item];
    });

    user.save(function(err, user) {
      if (callback) {
        callback(err, user);
      } else if (err) {
        return false;
      } else {
        return true;
      }
    });
  });
};
exports.updateById = updateById;

//Requesting for key while forgetting password
exports.forgotPasswordReq = function(req, res, next){
debugger;
  var phone = req.body.phone;
  var validDate =  new Date();

  User.findOne({'phone' : phone },function(err, user) {
      if (err) {
      //  res.send(new Response.respondWithData('failed','Error looking up user'));
        return next(err);
      } else {
        var key = passwordKeyGen();
        user.passwordResetKey = key;
        user.passwordKeyValidTill = validDate.setDate(validDate.getDate() + 1);
        user.save(function(err){
          if (err) {
            console.log("Error reset the key");
            return next(new Response.respondWithData('failed','Error reset the key: '));
          }
          return next(res.send(200, {"key" :key, message: "Password has to be reset in 1 days"}));
        });
      }
    });
}

function passwordKeyGen() {
  var text = "";
  var possible = "ABCDEFGHIJKLM NOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for( var i=0; i < 4; i++ ) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

//Resetting the password using key
exports.passwordReset = function(req, res, next){
 debugger;
  var passwordResetKey = req.params.passwordResetKey;
  var newPassword = req.params.password;
  var phone = req.params.phone;

  User
    .findOne({'phone' : phone  , "passwordKeyValidTill": {'$gte': Date.now()}})
    .exec(function(err, user) {
      console.log(user);
      if (err) {
        console.log("User not found: " + err);
        return next(new Response.respondWithData("failed","User doesn't have password reset request"));
      }
      if (user.passwordResetKey !== passwordResetKey ) {
        // Wrong key

        console.log("Invalid key");
        return next(new restify.InvalidArgumentError("Invalid key"));
      } else {
        user.password= newPassword;
        console.log("user pwd" +user.password);
        user.save(function(err, user) {
          if (err) {
            console.log(user.passwordResetKey);
            console.log(PasswordKey);
            return next(new restify.InternalError("failed","Unable to update password: " + err.message));
          }
            return next(res.send(200, {ok: true }));
        });
      }
    });
};

//Updating the current location of user
exports.currentLocation = function (req, res, next){
  debugger;
  var incomingUser = req.user;
  var data = req.params.user;
  console.log("got data");

  if (typeof data.location !== 'undefined') {
   try {
     data.location = common.formatLocation(data.location);
   } catch (e) {
     console.log("invalid location");
     res.send(new restify.InvalidArgumentError(e.message));
     return next();
   }
 }
  var result = incomingUser;
  result.location = data.location;
  result.save(function(err,user){
    console.log(user.name+ user.location);
    if(err){
           res.send(new Response.respondWithData('failed', 'Error updating location'));
           return next();
         } else {
           res.send(200,{user: user});
           return next();
         }
       })
}

//Fetching user name
exports.nameDetails = function (req, res, next){
  var phone = req.params.phone;
  User
    .findOne({'phone' : phone})
    .exec(function(err, user) {
      console.log(user);
      if (err) {
        console.log("User not found: " + err);
        return next(new Response.respondWithData("failed","User doesn't have password reset request"));
      }
    console.log(user.name);
    res.send(200,{user:user.name});
    return next();
  })
}

//regId
exports.userRegId = function(req, res, next){
  var data = req.body.data;
  var incomingUser = req.user;
console.log("got"+user);
  var user = incomingUser;
  user.regId = data.regId;
  user.save(function(err,data){
    console.log(data.regId);
  if(err){
         res.send(new Response.respondWithData('failed', 'Error saving regId'));
         return next();
       } else {
         res.send(200,{user: data.regId});
         return next();
       }
     })
}
