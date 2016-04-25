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
  app.post('/api/user/updateprofile', needsAuth, authController.updateProfile);
  app.post('/api/user/changepassword',needsAuth, authController.changePassword);
  app.post('/api/user/settingsupdate',needsAuth,authController.settingsUpdate);
  app.post('/api/user/passwordReset', authController.passwordReset);
  app.post('/api/user/forgotpasswordReq', authController.forgotPasswordReq);
  app.post('/api/user/currentlocation',needsAuth,  authController.currentLocation);
  app.get('/api/user/username/:phone',authController.nameDetails);
  app.post('/api/user/regid',needsAuth, authController.userRegId);
  //Deals
  app.post('/api/deal/gethistory',needsAuth,dealController.getHistory);
  app.put('/api/deal/updatedeal/:dealId', needsAuth, dealController.updateDeal);
  app.del('/api/deal/deletedeal/:dealId', needsAuth, dealController.deleteDeal);
  app.post('/api/deal/postdeal',needsAuth, dealController.postDeal);
  app.get('/api/deal/getdeal',needsAuth, dealController.getDeals);
  app.put('/api/deal/acceptdeal/:id',needsAuth,dealController.acceptDeal);
  app.put('/api/deal/rejectdeal/:id',needsAuth,dealController.rejectDeal);
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
