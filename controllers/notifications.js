var
  restify = require('restify');

 exports.sendPassword = function (userPhone, pass, callback) {
   if (process.env.NODE_ENV !== 'production' &&
     process.env.GOD_MODE == "ON" &&
     JSON.parse(process.env.GOD_NUMBERS).indexOf(userPhone) !== -1) {
     return callback(null, userPhone.substr(-4, 4));
   }

   // Validate phone number format - +[1/2/3 digit country code][10 digit phone number]
   var phoneRegex = /^\+[0-9]{1,3}([0-9]{10})$/;
   if (!userPhone.match(phoneRegex)) {
     return callback(new Error("Phone number invalid."));
   }

   var phoneNumber = userPhone.slice(-10);
   var countryCode = userPhone.substr(0, userPhone.indexOf(phoneNumber));

   // Select SMS service provider based on country code
   switch (countryCode) {
     case '+91':
       sendMsg91(userPhone, pass, callback);
       break;

     default:
       return callback(new Error("Buy1Get1 is not supported in your country."));
   }
 };

 var sendMsg91 = function (userPhone, pass, callback) {
   debugger;
   var verification = "Password for the registered mobile "+userPhone+" in Buy1Get1 is "+pass;
   var phone = userPhone.split('+')[1];
   var senderid = "BY1Get1";
   var smsAuthKey = process.env.MSG91_AUTHKEY || "badAuthKey";
   var smsGatewayURL = "http://api.msg91.com";
   var sendSMSQuery = "/api/sendhttp.php?" +
     "authkey=" + smsAuthKey +
     "&mobiles=" + phone +
     "&message=" + encodeURIComponent(verification) +
     "&sender=" + senderid +
     "&route=4";

   var restClient = restify.createClient({
     url: smsGatewayURL
   });

   restClient.get(sendSMSQuery, function (err, req) {
     if (err) {
       console.log("SMSGateway request error: ");
       console.log(err);
       callback(err);
     }
     req.on('result', function (err, res) {
       if (err) {
         console.log("SMSGateway response error: ");
         console.log(err);
         callback(err);
       }
       if (res.statusCode === 200) {
         callback(null, verification);
       } else {
         // Non-200 status code
         callback(res.statusCode);
       }
     });
   });
 };

var generateVerificationMessage = function () {
  
         var verificationCodeLen = 6;
  
         var verificationCode = ("" + Math.random()).substring(2, 2 + verificationCodeLen);

  
         var verificationMessage = "Welcome to Buy1Get1. Use the code " +
    
            verificationCode +
    
            " to complete signing up with us.";
  
          return {
    
            message: verificationMessage,
    
            code: verificationCode
 
 };

};
