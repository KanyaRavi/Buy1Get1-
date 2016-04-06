var authController = require('./controllers/auth.js');
var dealController = require('./controllers/deals.js');
var path = require('path');
var restify = require('restify');

module.exports = function (app){

  app.get('/', function(req, res) {
    res.send(200, {Welcome: true});
  });

  app.post('/api/user/signup',authController.signup);
  app.post('/api/user/login',authController.login);
  app.del('/api/user/logout',needsAuth,authController.logout);
  app.post('/api/user/sociallogin',authController.socialLogin);
  app.post('/api/user/forgotpassword',authController.forgotPassword);
  app.post('/api/user/updateprofile', needsAuth, authController.updateProfile);
  app.post('/api/user/changepassword',authController.changePassword);
  app.post('/api/user/settingsupdate',needsAuth,authController.settingsUpdate);
  app.post('/api/deal/gethistory/:id',needsAuth,dealController.getHistory);
  app.post('/api/deal/updatedeal/:id', needsAuth, dealController.updateDeal);
  app.del('/api/deal/deletedeal/:dealId', needsAuth, dealController.deleteDeal);
  app.post('/api/user/passwordReset', authController.passwordReset);
  app.post('/api/user/changePasswordReq', authController.changePasswordReq);
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
