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

/*User Schema*/

var userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: Number,
    required: true,
    unique: true
  },
  email:{
    type: String
  },
  password: {
    type: String
  },
  _coordinates: {
    type: [Number],
    index: '2dsphere',
    default:[0,0]
  },
  deals:[dealSchema],
  settings: {
    whistle: {
      type: Boolean,
      default: true
    },
    radius:{
      type: Number,
      default: 10
    },
    notification:{
      type: Boolean,
      default: true
    },
    expiry:{
      type: Number,
      default: 24
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  accessToken:{
    type:String
  },
  facebookId:{
    type: String
  },
  googleId:{
    type: String
  },
  regId: {
   type: String
 },
 passwordResetKey: {
   type: String,
   index: true,
   unique: true,
   sparse: true //http://stackoverflow.com/a/21211640/1885921
 },
 passwordKeyValidTill: Date
}, {collection: 'user'});
//Virtual properties
userSchema.path('name').validate(function (value) {
  return value && (value.length >= 3 && value.length <= 64);
}, 'Name should be between 3 and 64 characters long.');



userSchema.path('email').validate(function (value) {
  return validator.isEmail(value);
}, 'Invalid email');

userSchema.path('_coordinates').validate(function (value) {
  return (
  Array.isArray(value) &&
  value.length === 2 &&
  'number' === typeof value[0] &&
  'number' === typeof value[1]
  );
}, 'Invalid location. Should be geoJSON');

// Setters, Getters
userSchema.virtual('location').set(function (location) {
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

userSchema.set('toObject', { getters: true, virtuals: true });
userSchema.set('toJSON', { getters: true, virtuals: true });

// Instance methods
userSchema.methods.toJSON = function () {
  return {
    _id: this.id,
    name: this.name,
    phone: this.phone,
    email: this.email,
    location: this.location,
    deals: this.deals,
    settings:{
      whistle: this.settings.whistle,
      radius: this.settings.radius,
      notification: this.settings.notification,
      expiry: this.settings.expiry
    },
    createdAt: this.createdAt,
    accessToken: this.accessToken,
    facebookId : this.facebookId,
    googleId:this.googleId,
    regId: this.regId
  };
};

userSchema.methods.update = function (updates, options, cb) {
  var userToUpdate = this;
  if (typeof options !== 'object' && typeof options === 'function') {
    cb = options;
  }
  var editableFields = ['name', 'email', 'phone', 'deals' , 'settings',  'location', 'regId'];
  editableFields.forEach(function (field) {
    if (typeof field === 'String' && updates[field] !== undefined) {
      userToUpdate[field] = updates[field];
    }
  });
  userToUpdate.save(cb);
};

userSchema.methods.createSession = function (cb) {
  this.accessToken = common.rand();
  this.save(cb);
};

userSchema.methods.createSocialSession = function (id, type, cb) {
  if(type == 'google'){
    this.googleId = id;
    this.accessToken = common.rand();
    this.save(cb);
  }  else {
      this.facebookId = id;
      this.accessToken = common.rand();
      this.save(cb);
  }
};


/**
 * Static Methods
 */

// Method to create a user object
userSchema.statics.create = function (userObject, callback) {
  //var self = this;
  //var newUser = new self(userObject);
  //newUser.save(function (error, createdUser) {
  //  callback(error, createdUser);
  //});
  new this(userObject).save(callback); //8-)
};

// Method to fetch a user based on authentication key passed in request
userSchema.statics.findByAuthKey = function (authKey, callback) {
  this.findOne({ accessToken: authKey }, callback);
};

// Ensure that the thumb rules for user model are followed by... ALL
userSchema.pre('save', function (next) {
  // When there is a problem, populate err and
  // let it passed on to the next() at the end
  var err = null;

  // 1. Validation #1

  next(err);
});

mongoose.model('Deal', dealSchema);
mongoose.model('user', userSchema);
