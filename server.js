var restify = require('restify'),
  _ = require('lodash'),
  db = require("./db.js"),
  app = restify.createServer({ name: 'Server' }),
  bunyan = require('bunyan'),
  domain = require('domain');

// Use domain to catch exceptions
app.use(function (req, res, next) {
  var d = domain.create();
  domain.active = d;
  d.add(req);
  d.add(res);

  d.on('error', function (err) {
    console.error("Error: " + err.stack);
    res.send(500, err);
    next(err);
  });

  res.on('end', function () {
    d.dispose();
  });

  d.run(next);
});

// Use the body parser middleware
app.use(restify.bodyParser());

// Use the query parser middleware for GET call parameters
app.use(restify.queryParser());

// Create a bunyan based logger
var log = bunyan.createLogger({
  name: 'Buy1Gey1',
  streams: [
    {
      level: 'debug',
      stream: process.stdout
    }
  ],
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

log.info("Starting up the server");
log.info("Connecting to MongoDB");

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
/*/
      //probable source of memleaks by manifold `setTimeout`s
      scheduler.init();
//*/
      // ... and ... ACTION!

      app.listen(process.env.PORT || 3000, function (err) {
        log.info("Whistle API Server %s listening at %s", app.name, app.url);
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
    log.info("Worker PID#" + process.pid + " stop accepting new connections");
    app.close(function (err) {
      log.info("Worker PID#" + process.pid + " shutting down!!!");
      process.send({cmd: 'suicide'});
    });
}
