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
     registeringUser.verified = true
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



exports.login = function (req, res, next) {
  var phone = req.body.phone;
  var password = req.body.password;

  createNewSession(phone, password, function (err, user) {
    if (err) {
      res.send(new restify.InvalidCredentialsError("Username/Password invalid."));
      return next();
    } else {
      if (user) {
        console.log("login sucess");
        res.send({user: user});
        return next();
      } else {
        res.send(new restify.ResourceNotFoundError("User not found."));
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
      if (!user.password(password)) {
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

 exports.forgotPassword = function(req, res, next){
       var user = req.body.user;
       console.log("got");
      User.findOne({'phone':user.phone}, function(err, User){
        console.log("found");
         if(err){
           res.send(new Response.respondWithData("failed","Error looking up user"));
           return next();
         } else if(User){
             var pass = User.password;
             console.log(pass);
             notifications.sendPassword(user.phone, pass, function(err, result){
               if(err){
                 res.send( new Response.respondWithData('failed', 'Error sending password'));
                 return next();
               } else {
                 console.log("sucess");
                 res.send(new Response.respondWithData('success', 'Password sent to your mobile'));
                 return next();
               }
             });
         } else {
           console.log("incorrect");
           res.send(new Response.respondWithData('failed', 'Incorrect Mobile'));
           return next();
         }
       })
     }

   exports.updateProfile = function (req, res, next) {
       var user = req.user;
       var updatedSettings = req.params.user;

       // Check if the updatedProfile is empty
       if (!updatedSettings || Object.keys(updatedSettings).length === 0) {
         console.log("Error: Empty or no object sent to update user.");
         res.send(new restify.InvalidArgumentError("Empty or no user data sent to udpate."));
         return next();
       }

       if (typeof updatedSettings.location !== 'undefined') {
         try {
           updatedSettings.location = common.formatLocation(updatedSettings.location);
         } catch (e) {
           res.send(new restify.InvalidArgumentError(e.message));
           return next();
         }
       }

       user.update(updatedSettings, function(err, user) {
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
           var immutableProperties = ['accessToken', 'password', 'lastLogin'];
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

  exports.changePassword = function(req, res, next){
  var id = req.params.id;
  var password = req.body.password;
  console.log("got details");
  User.findById(id, function(err, user){
    if(err){
        res.send(new Response.respondWithData("Error looking up user"));
        return next();
      }
  user.password = password;
  user.save(function(err, user)
  {
   if(err) throw err;
   console.log("pwd resetted");
   res.send(new Response.respondWithData('success', 'Your password has been changed successfully'));
    return next();
   });
 });
}


exports.settingsUpdate = function (req, res, next) {
  var user = req.user;
  var updatedSettings = req.params.user;

  // Check if the updatedsettings is empty
  if (!updatedSettings || Object.keys(updatedSettings).length === 0) {
    console.log("Error: Empty or no object sent to update user.");
    res.send(new restify.InvalidArgumentError("Empty or no user data sent to udpate."));
    return next();
  }

  if (typeof updatedSettings.location !== 'undefined') {
    try {
      updatedSettings.location = common.formatLocation(updatedSettings.location);
    } catch (e) {
      res.send(new restify.InvalidArgumentError(e.message));
      return next();
    }
  }

  user.update(updatedSettings, function(err, user) {
    if (err) {
      errors.processError(err, req, res);
    } else {
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
      var immutableProperties = ['accessToken', 'password', 'lastLogin'];
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
