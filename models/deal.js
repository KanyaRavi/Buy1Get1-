var mongoose = require('mongoose');
var path = require('path');
var common = require('../helpers/common.js');
var validator = require("validator");

/*Deal Schema*/

var dealSchema = new mongoose.Schema({
  shopName: {
    type: String,
    required: true
  },
  deal: {
    type: String,
    required: true
  },
  price:{
    type: Number,
    required: true
  },
  start:{
    type: Date,
    default: Date.now
  },
  end:{
    type: Date
  },
  expiry:{
    type: Date
  },
  _coordinates:{
    type: [Number],
    index: ['2dsphere'],
    default: [0,0]
  },
  comments:{
    type: String
  },
  accepted: {
    type:mongoose.Schema.Types.ObjectId, ref:'user'
  },
  rejected: {
    type:mongoose.Schema.Types.ObjectId, ref: 'user'
  }
});
// Virtuals
/*dealSchema.virtual('start').get(function () {
  return this.start.getTime();
});*/

dealSchema.set('toObject', { virtuals: true });
dealSchema.set('toJSON', { virtuals: true });

dealSchema.methods.toJSON = function () {
  return {
    _id: this.id,
    shopName: this.shopName,
    deal: this.deal,
    price: this.price,
    start: this.start,
    end: this.end,
    expiry: this.expiry,
    accepted: this.accepted,
    rejected: this.rejected,
  };
};

dealSchema.path('_coordinates').validate(function (value) {
  return (
  Array.isArray(value) &&
  value.length === 2 &&
  'number' === typeof value[0] &&
  'number' === typeof value[1]
  );
}, 'Invalid location. Should be geoJSON');

// Setters, Getters
dealSchema.virtual('location').set(function (location) {
  if ((Array.isArray(location) && location.length === 2)) {
    this._coordinates = location;
  } else if (location === Object(location) &&
    location.type && location.type === 'Point' &&
    location.coordinates && location.coordinates.length === 2
  ) {
    this._coordinates = location.coordinates;
  }
})
.get(function () {
  return {
    "type": "Point",
    "coordinates": this._coordinates,
  }
});



/**
 * Static Methods
 */

// Method to create a user object
dealSchema.statics.create = function (dealObject, callback) {
  //var self = this;
  //var newDeal = new self(dealObject);
  //newDeal.save(function (error, createdDeal) {
  //  callback(error, createdDeal);
  //});
  new this(dealObject).save(callback); //8-)
};

// Ensure that the thumb rules for user model are followed by... ALL
dealSchema.pre('save', function (next) {
  // When there is a problem, populate err and
  // let it passed on to the next() at the end
  var err = null;

  // 1. Validation #1

  next(err);
});

mongoose.model('deal', dealSchema);
