//Modules
var restify = require('restify');
var _ = require('lodash');
var bunyan = require('bunyan');
var path = require('path');
var db = require("./db.js");


var app = restify.createServer({name: 'Server'});
app.use(restify.acceptParser(app.acceptable));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(restify.queryParser());
app.use(restify.bodyParser());

var log = bunyan.createLogger({
  name: 'Buy1Get1',
  serializers: bunyan.stdSerializers
});

// Attach the logger to the restify server
app.log = log;

app.on('after', function (req, res, route, error) {
  req.log.debug("%s %s", req.method, req.url);
  req.log.debug("%s %s", req.headers['Authorization'], req.headers['user-agent']);
  req.log.debug(req.params);
  req.log.debug("%d %s", res.statusCode, res._data ? res._data.length : null);
});

app.get('/testclient', function (req, res, next) {
  require('fs').readFile(__dirname + '/public/index.html', function (err, data) {
    if (err) {
      next(err);
      return;
    }

    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(data);
    next();
  });
});

app.get('/' + process.env.LOADERIO_TOKEN + '.txt', function (req, res) {
  res.setHeader('Content-Type', 'text/plain');
  return res.send(process.env.LOADERIO_TOKEN);
});

console.log("Starting up the server");
console.log("Connecting to MongoDB");

function start(cb) {
  cb = cb || function(err){
    if(err){
      throw err;
    }
  };
  var m = db.connect(function (err) {
    if (err) {
      log.error(err);
      process.exit(-1);
    }

    // Initialize the database
    db.init(function (err) {
      if (err) {
        log.error("Error initializing DB");
        process.exit(-1);
      }

      app.use(function(req,res,next){
        req.db = m;
        next();
      });
      // Load the routes
      require("./route")(app);
      app.listen(process.env.PORT || 3000, function (err) {
        console.log(" %s listening at %s", app.name, app.url);
        cb(err);
      });
    });
  });
}
if (module.parent) {
  module.exports = exports = start;
} else {
  start();
}

module.exports.cleanup = function() {
    console.log("Worker PID#" + process.pid + " stop accepting new connections");
    app.close(function (err) {
      console.log("Worker PID#" + process.pid + " shutting down!!!");
      process.send({cmd: 'suicide'});
    });
}
