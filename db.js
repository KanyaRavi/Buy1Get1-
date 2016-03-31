var
  fs = require('fs'),
  mongoose = require('mongoose'),
  models_path = __dirname + '/models',
  mongoURI = process.env.MONGOLAB_URI || "mongodb://localhost:27017/buy1get1";

exports.connect = function(callback) {
  var db = mongoose.connect(mongoURI);
  var connection = mongoose.connection;
  connection.on('error', function(err) {
    console.log("MongoDB: Connection error.");
    callback(err);
  });

  connection.once('open', function () {
    console.log("MongoDB:Connected.");
    callback(null, connection)
  });

  connection.on('disconnect', function(){
    console.log("Mongo disconnected");
  });

  connection.on('error',function (err) {
    console.log('Mongoose default connection error: ' + err);
  });

  process.on('SIGINT', function() {
    mongoose.connection.close(function () {
      console.log('Mongoose default connection disconnected through app termination');
      process.exit(0);
    });
  });

  return db;
};

exports.init = function (callback) {
  /** @TODO Automate DB clearing (optimist?) */

  console.log("Initializing database.");

  fs.readdirSync(models_path).forEach(function(file) {
    require(models_path + '/' + file);
  });
  callback(null);
};
