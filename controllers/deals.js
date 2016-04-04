var mongoose = require('mongoose');
var restify  = require('restify');
var async    = require ('async');
var validator = require("validator");
var path = require('path');
var bcrypt = require('bcrypt-nodejs');
var User = mongoose.model('user');
var bodyParser = require('body-parser');
var Response = require('../helpers/response.js');
var errors = require('../helpers/errors.js');
var common = require('../helpers/common.js');
var notifications = require('./notifications.js');
_ = require('lodash');


exports.getHistory = function (req, res, next) {
  if (req.params.id) {
    // Validate the id
    var id = req.params.id;
    User.findOne({ 'deals._id': id })
      .exec(function (err, user) {
        //console.log(user);
      if (err) {
        return next(new Response.respondWithData('failed','Cant find the user'));
      }
     for(i=0;i<=deals.length;i++){
     var dealObj = _.filter(user.deals, { id: id })[0];
      }
      console.log("user deals:" +user.deals);
      next(res.send(200, dealObj));

    });
  }
};

exports.updateDeal = function(req, res, next){
  var user = req.user;
  var updatedDeal = req.params.user;

  // Check if the updatedProfile is empty
  if (!updatedDeal || Object.keys(updatedDeal).length === 0) {
    console.log("Error: Empty or no object sent to update user.");
    res.send(new Response.respondWithData("failed","Empty or no user data sent to udpate."));
    return next();
  }

  if (typeof updatedDeal.location !== 'undefined') {
    try {
      updatedDeal.location = common.formatLocation(updatedDeal.location);
    } catch (e) {
      res.send(new Response.respondWithData(e.message));
      return next();
    }
  }

  user.update(updatedDeal, function(err, user) {
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


exports.deleteDeal = function (req, res, next) {
  // Delete a Deal by its id
  var dealId = req.params.dealId;
  req.user.deals.pull(dealId);
  req.user.save(function (err, user) {
    if (err) {
      req.log.error("Error in deleting Deal");
      res.send(new Response.respondWithData(err.message));
      return next();
    }
     res.send(new Response.respondWithData("success","Deleted deal"));
    return next();
  });
};
