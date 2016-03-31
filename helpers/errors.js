exports.processError = function (error, req, res) {
  // processing mongoose validation errors
  //http://mongoosejs.com/docs/validation.html
  if (error.name === 'ValidationError') {
    res.status(400);
    var errs = [];
    for (var x in error.errors) {
      if (error.errors.hasOwnProperty(x)) {
        errs.push({
          'message': error.errors[x].message,
          'field': error.errors[x].path,
          'value': error.errors[x].value
        });
      }
    }

    res.json({
      'status': 'Error',
      'code': 400,
      'errors': errs
    });
  } else if (error.code === 11000) {
    res.status(400);
    res.json({
      'status': 'Error',
      'code': 400,
      'errors': [
        {
          'code': 400,
          'message': 'Duplicate entry!'
        }
      ]
    });
  } else {
    throw error;
  }
};
