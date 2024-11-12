const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email!'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password!'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password!'],
    validate: {
      // this will only work on save
      validator: function (el) {
        // validating password in database
        return el === this.password;
      },
      message: 'Password does not match!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false, // this helps to hide the active flag in the database as we don't want anyone to know if the user is active or not
  },
  verified: {
    type: Boolean,
    default: false,
    // select: false, // used to hide the flag
  },
});

// to encrypt the data, between getting and saving the data
userSchema.pre('save', async function (next) {
  //if the password is not modified it will simply return
  if (!this.isModified('password')) return next();

  // hashing password with the salt of 12
  this.password = await bcrypt.hash(this.password, 12);
  console.log(this.password);
  // Research about salt and cost in hashing

  // only having one password property
  // deleting passwordConfirm as we don't need to save it in the database
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  // if password is not modified or the document is new go to the another middleware
  if (!this.isModified('password') || this.isNew) {
    return next();
  }
  //but when we reset password
  this.passwordChangedAt = Date.now() - 1000;
  // Note:
  //  sometimes the token is created before the passwordChangedAt property is created
  //  so we fix it by subtracting 1s from the Date.now(), which will not be 100% accurate but it will not be a problem as 1s does not create any difference at all
  // putting passwordChangedAt 1s in the past will ensure that the token is always created after the password is changed

  next();
});

// hiding the incative user from the database
userSchema.pre(/^find/, function (next) {
  // this points to the current user
  this.find({ active: true });
  next();
});

/**
 * Instance method, available to all the user document
 *
 * @param {string} candidatePassword // password that we type
 * @param {string} userPassord // password or hashed password form database
 * @returns true or false
 */
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/**
 *  If password is changed
 *  we get the timestamp of the time when the password was changed
 *  and compare with the JWTTimestamp
 *
 * @param {time} JWTTimestamp // time when the token is created while it is signup or login
 * @returns true or false
 */
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; // returns true
  }

  // returns false by default
  return false;
};

/**
 *  This method create a password reset token which will be send to the user
 *  that the user can then use to create a new real password,
 *  only user will have access to this token which behaves kind a like a password
 *  It is used so the the hacker cannot change our password easily
 *  If someone other than the user get this token, then they can easily control the account.
 *  So, just like a password we should never store a plain reset token in the database.
 *
 *  @returns reset token
 */
userSchema.methods.createPasswordResetToken = function () {
  // const resetToken = // generate token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // encrypting the token with the built in crypto module
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  //after this we have to save it in the database schema, so that we can compare it
  // with the token that the user provide

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
