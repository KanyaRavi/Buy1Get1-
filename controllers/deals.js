var mongoose = require('mongoose');
var restify  = require('restify');
var validator = require("validator");
var path = require('path');
var User = mongoose.model('user');
var Deal = mongoose.model('Deal');
var bodyParser = require('body-parser');
var Response = require('../helpers/response.js');
var errors = require('../helpers/errors.js');
var common = require('../helpers/common.js');
var notifications = require('./notifications.js');
var _ = require('lodash');
var aggregatedistance = 1 / 6371;
var mdistanceMultiplier = 6371;


var SearchToQuery = function (dealObj) {
  var dealSearchObj = {};
  return dealSearchObj;
}

//Posting a new deal
exports.postDeal = function(req, res, next){
  var Deal = mongoose.model('Deal');
  var dealObj = req.params.deal;
  var radius = req.params.radius;
  var location = req.params._coordinates;
  var user = req.user;
  var newDeal = new Deal(dealObj);
  console.log(dealObj);
  user.deals.push(newDeal);

  user.save(function (err, data) {
     if (err) {
       console.log("Error saving Deal");
       return next(new restify.InternaError("Error in Deals. Try again. " + err.message));
      } else {
       console.log("Posted deal");
     }

    // Search for matching whistlers
    var SearchQuery =  SearchToQuery(dealObj);
    searchDeal({
      user: req.user,
      radius: radius,
      query: SearchQuery
    }, function (err, users) {
      if (err) {
        req.log.error(err);
        return next(new restify.InternalError(err.message));
      } else {
        console.log("Found %d matching Deals", users.length);
        var results = {};
        if (dealObj === undefined) {
          results = {
            matchingDeals: users
          };
        } else {
          results = {
            newDeal: newDeal,
            matchingDeals: users
          };
        }
        next(res.send(200, results));
      }
    });
     })
}


var searchDeal = function (options, callback) {

  // if authenticated, use the user's recorded location
  if (options.user && options.user.location) {
    options.location = options.user.location;
  }

  User.aggregate([
    {
      $geoNear: {
        near: options.location.coordinates,
        maxDistance: (options.radius / mdistanceMultiplier),
        "spherical": true,
        "distanceField": "dis",
        "distanceMultiplier": mdistanceMultiplier
      }
    },
    {
      $unwind: "$deals"
    },
    {
      $project: {
        name: 1,
        deals: {
          shopName: 1,
          deal: 1,
          price: 1,
          start: 1,
          end: 1,
          expiry: 1,
          comments:1,
          accepted: 1,
          rejected: 1
        },
        location: {
          type: {$literal: "Point"},
          coordinates: "$_coordinates"
        }
      }
    }
  ], function (err, users) {
    if (err) {
      callback(err);
    } else {
      // Hashing
      // Generate hash for new results
      var newHash = common.sha512(JSON.stringify(users));
      callback(null, users, newHash);
    }
  });
};
//Searching nearby deals
exports.getDeals = function (req, res, next) {
  // Validate the parameters
  if (typeof req.params.radius === 'undefined') {
    res.send(new restify.InvalidArgumentError("'radius' missing."));
    return next();
  }
  if (!validator.isFloat(req.params.radius)) {
    res.send(new restify.InvalidArgumentError("'radius' should be a valid decimal number."));
    return next();
  }
  var radius = validator.toFloat(req.params.radius);
  if (radius <= 0) {
    res.send(new restify.InvalidArgumentError("'radius' should be more than zero."));
    return next();
  }
  console.log("fetching");
  // Fetch the search results
  searchDeal({
    user: req.user,
    radius: radius
  }, function (err, matchingDeals, resultHash) {
    if (err) {
      req.log.error("Error finding matching whistles");
      return next(new restify.InternalError(err.message));
    } else {
      console.log("matching");
      if (!matchingDeals) {
        req.log.info("Couldn't find matching whistles");
        return next(new restify.ResourceNotError(err.message));
      } else {
        if (req.params.prevHash && (req.params.prevHash === resultHash)) {
          res.send(304);
          return next();
        } else {
          var results = {
            matchingDeals: matchingDeals,
            resultHash: resultHash,
            criteria: {
              radius: radius,
              location: req.user._coordinates
            }
          };
          return next(res.send(results));
        }
      }
    }
  });
};

//Fetching deal history
exports.getHistory = function (req, res, next) {
  var incomingUser = req.user;
  var id = incomingUser._id;
  User.findById(id,function (err, user){
    console.log(user);
    if (err) {
      return next(new Response.respondWithData('failed','Cant find the user'));
    }
    var dealObj = _.filter(user.deals);
    var data = user.deals;
    var accepted = data.accepted;
     console.log("accepted:" + accepted);
     console.log("user deals:" +dealObj.deal);
     next(res.send(200, dealObj ));
  });
}

exports.updateDeal = function(req, res, next){

  var dealObj = _.filter(req.user.deals, { id: req.params.dealId })[0];
  console.log(dealObj);
  if (!dealObj) {
    console.log("Deal not found: " + req.params.dealId);
    res.send(new restify.ResourceNotFoundError("Deal not found: " + req.params.DealId));
    return next();
  }

  Object.keys(req.params).forEach(function (property) {
    if (['shopName', 'deal', 'price', 'expiry', 'comments', 'end'].indexOf(property) > -1) {
      dealObj[property] = req.params[property];
    }
  });
  req.user.save(function (err, user) {
    if (err) {
      errors.processError(err, req, res);
    } else {
      var updatedDeal = _.filter(req.user.deals, { id: req.params.dealId })[0];
      res.send({ updatedDeal: updatedDeal });
      return next();
    }
  });
};

//Deleting the posted deal
exports.deleteDeal = function (req, res, next) {
  // Delete a Deal by its id
  var dealId = req.params.dealId;
  console.log("got id");
  req.user.deals.pull(dealId);
  req.user.save(function (err, user) {
    if (err) {
      req.log.error("Error in deleting Deal");
      res.send(new Response.respondWithData(err.message));
      return next();
    }
    console.log("deal deleted");
     res.send(new Response.respondWithData("success","Deleted deal"));
    return next();
  });
};
