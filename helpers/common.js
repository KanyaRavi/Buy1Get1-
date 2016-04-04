var crypto = require('crypto');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toString();
};
exports.md5 = md5;

function sha512(str) {
  return crypto.createHash('sha512').update(str).digest('hex').toString();
};
exports.sha512 = sha512;

function rand(length) {
  if ('undefined' === typeof length) {
    length = 512;
  }
  length = parseInt(length, 10);
  return sha512(crypto.randomBytes(length).toString());
};
exports.rand = rand;

function generateCode(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

exports.generateCode = generateCode;

//Location Validate
exports.formatLocation = function (location) {
  // If location is empty
  if (!location) {
    location = [0, 0];
  } else {
    // Does location contain coordinates property?
    if ('undefined' !== typeof location.coordinates) {
      location = location.coordinates;
    }
    // Is location an array with two values?
    if (!(Array.isArray(location) && location.length === 2)) {
      throw new Error("Incorrect location format: " + location);
    }
  }
  return { "type": "Point", "coordinates": location };
};
