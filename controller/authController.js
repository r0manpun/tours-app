const crypto = require('crypto');
const User = require('../model/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
// const sendEmail = require('../utils/email');
const Email = require('../utils/email');

/**
 *creating token
 * @param {string} // user id from the database
 * @returns token
 */
const signToken = (id, secretKey, expiresIn) => {
  return jwt.sign({ id }, secretKey, {
    expiresIn: expiresIn,
  });
};

/**
 * Creates the Token and send the response
 *
 * @param {object} user
 * @param {number} statusCode
 * @param {response} res
 */
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id, process.env.JWT_SECRET, '1m');
  const refreshToken = signToken(user._id, process.env.JWT_SECRET, '1d');

  //sending JWT via Cookie
  // Cookie is basically a small piece of text that a sever can send to a client
  // then when the client recieves a cookie it will automatically store (in browser) and automatically send
  // it back along with the future request to that server where it came from
  // const cookieOptions = {
  //   expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 1000),
  //   // new Date(Date.now() + process.env.JWT_EXPIRES_IN * 1000),
  //   // secure: true, // use true for https
  //   httpOnly: true, // in order to prevent the browser to modify or access the cookie, for cross-site scripting attack
  // };

  if (process.env.NODE_ENV === 'production') {
    return (cookieOptions.secure = true);
  }

  // res.cookie('jwt', token, cookieOptions);
  res.cookie('jwt', refreshToken, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    // secure: true, // use true for https
    httpOnly: true, // in order to prevent the browser to modify or access the cookie, for cross-site scripting attack
  });

  // remove password from the output but not from the data base as we don't use save
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    message: res.message,
    token,
    accessToken: token,
    data: {
      user,
    },
  });
};

exports.refreshAccessToken = catchAsync(async (req, res, next) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) return next(new AppError('Unauthorized', 401));
  // Get refresh token from cookies
  const refreshToken = cookies.jwt;
  if (!refreshToken)
    return next(
      new AppError('No refresh token found, please login again.', 403),
    );

  // Verify refresh token
  const decoded = await promisify(jwt.verify)(
    refreshToken,
    process.env.JWT_SECRET,
  );

  // Check if user still esists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError('The user belongings to this token no longer exists.', 403),
    );

  //Generate a new access token
  res.message = 'new refresh token created';
  createSendToken(currentUser, 200, res);
});

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  // creating jwt token
  const verificationToken = signToken(
    newUser._id,
    process.env.JWT_SECRET,
    '1d',
  );

  const verifyUrl = `${req.protocol}://${req.get('host')}/verify-email?token=${verificationToken}`;

  await new Email(newUser, verifyUrl).sendVerify();

  // replaced with the function that create and send token
  createSendToken(newUser, 201, res);

  res.status(201).json({
    status: 'success',
    message: 'user created successfylly!',
    verificationToken,
    data: newUser,
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // checks if the email and password is filled
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // checks if user exist then select the password
  const user = await User.findOne({ email }).select('+password');

  // checks if password is correct
  if (
    !user ||
    // this corectPassword is instance method used form userModel
    !(await user.correctPassword(password, user.password))
  ) {
    return next(new AppError('Invalid Credentials!', 401));
  }

  // if everything is ok, send token to the client
  res.message = 'Login successfull 🎉🎉!';
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  const cookies = req.cookies;
  console.log('cookies line 145: ' + cookies.jwt);
  if (!cookies?.jwt) return res.sendStatus(204); // No content
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  // res.clearCookie('jwt', { httpOnly: true, secure: true });

  res.status(200).json({
    status: 'success',
    message: 'Cookie cleared',
  });
};

exports.authorize = catchAsync(async (req, res, next) => {
  // get token and check if it's true
  console.log('headers line 167: ' + req.headers.authorization);
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );
  }
  // verify the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log(decoded);
  // we promisify here to catch the error for jwt

  // to prevent if the user's id is altered and the user have deleted his/her id
  // check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists!', 401),
    );
  }

  // check if user changed password after token was issued
  // using instance methods
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'User recently changed password! Please log in  again.',
        401,
      ),
    );
  }

  //  Grant Access to Protected Route
  req.user = currentUser; // this code is crucial as this will send the user to the authenticateTo so that it can check if the user is regular user or if it is admin/lead-guide
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // If there is req.cookies.jwt
      // verify the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      // we promisify here to catch the error for jwt
      //   console.log(decoded);

      // to prevent if the user's id is altered and the user have deleted his/her id
      // check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // check if user changed password after token was issued
      // using instance methods
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      // req.user = currentUser; // this code is crucial as this will send the user to the authenticateTo so that it can check if the user is regular user or if it is admin/lead-guide
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.authenticateTo = (...roles) => {
  // it takes req.user form the protect middleware
  return catchAsync(async (req, res, next) => {
    // roles ['admin', 'lead-guide']. role ='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action!', 403),
      );
    }
    // if role is 'admin' or 'lead-guide' go to next middleware
    next();
  });
};

/* Password reset functionality
  1. we need to make forgetpassword middleware
      i. get user based on posted email
    ii. generate random reset token
   iii. send it  to user's email
 2. we need resetPassword middleware
     i. get user based on token
    ii. if token not expired, and there is a user, set new password
 iii. Update changedPasswordAt property for the user
  iv. log the user in, send JWT
 */

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('no user found!', 404));
  }

  // generate the random reset token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false }); //we have to save this so that they are stored in the database
  // otherwise it will not be saved

  try {
    // send the token to the user's email
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/reset-password/${resetToken}`;

    // const message = `Forget your password? Submit a PATCH request with your new password and passwordComfirmto ${resetURL}.\n If you didn't forgot your password, please ignore this mail.`;

    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token is valid for only 10 min!',
    //   message,
    // });

    await new Email(user, resetURL).sendPasswordReset();
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // this above 2 line will only modify but will not save
    //so we use to actually save the data
    // await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500,
      ),
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // if token has not expired and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save(); // we need validator to be true so we can leave it like that
  // update changePasswordAt property for the user

  // log the user in and send JWT
  createSendToken(user, 200, res);
});

// Updating Current User Password
//  we need to create update password middleware
//      i. get user from the collection
//     ii. check if the posted current password is correct
//    iii. if it's right update password
//     iv. log in user, send jwt

exports.updatePassword = catchAsync(async (req, res, next) => {
  // get user from the collection
  const user = await User.findById(req.user._id).select('+password');

  // check if the posted current password is correct
  console.log(
    await user.correctPassword(req.body.passwordCurrent, user.password),
  );
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password doesn't match!", 401));
  }

  // if current password matches, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  // save it to the document
  await user.save();
  // we don't use findByIdAndUpdate method because
  // 1. validator in userModel of passwordConfirm is not going to work, as it is only accessed by CREATE or SAVE
  // 2. the pre('save') middlewate in the userModel is also not going to work, as password will
  //   not be encrypted and passwordCreatedAt will not be added

  res.message = 'Password Updated Successfully';
  // log in user and send JWT
  createSendToken(user, 201, res);
});

// check if the user is verified or not
exports.checkVerificationStatus = catchAsync(async (req, res, next) => {
  const token = req.cookies.jwt;
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);

  if (user && user.verified) {
    return res.status(200).json({ verified: true });
  }

  res.status(200).json({ verified: false });
});
