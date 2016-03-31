var authController = require('./controllers/auth.js');
var path = require('path');
var restify = require('restify');

module.exports = function (app){

  app.get('/', function(req, res) {
    res.send(200, {Welcome: true});
  });

  app.post('/api/signup',authController.signup);
  app.post('/api/login',authController.login);
  app.del('/api/logout',needsAuth,authController.logout);
  app.post('/api/sociallogin',authController.socialLogin);
  app.post('/api/forgotpassword',authController.forgotPassword);
  app.post('/api/user', needsAuth, authController.updateProfile);
}

function needsAuth(req, res, next) {
  return isAuthenticated(req, res, next);
}

function isAuthenticated(req, res, next) {
  var authKey = req.headers.authorization;
  if (!authKey) {
    res.send(new restify.InvalidCredentialsError("Authentication required"));
    return false;
  }
  req.db.model("user").findByAuthKey(authKey, function(err, user) {
    if (err) {
	  res.send(new restify.InvalidCredentialsError("Authentication required"));
	  return;
	}

	if (!user) {
      res.send(new restify.InvalidCredentialsError("Authentication required"));

    } else {
      req.user = user;
      return next();
    }
  });
}
