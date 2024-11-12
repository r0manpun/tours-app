const Tour = require('../model/tourModel');
const User = require('../model/userModel');
const Booking = require('../model/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template

  // 3) Render that template using tour data from 1

  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // console.log(req.params);
  // 1) get the data, for the requested tour
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });
  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }

  // console.log(tour);

  res.status(200).render('tour', { title: `${tour.name}`, tour });
});

exports.getLoginForm = catchAsync(async (req, res, next) => {
  //
  res.status(200).render('login', {
    title: 'Login into your account',
  });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.getSignUpForm = catchAsync(async (req, res, next) => {
  res.status(200).render('signup', {
    title: 'Sign Up new account',
  });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });
  console.log(bookings);

  // 2) Find tours with the returned Ids
  // create an array of all Ids and query for tours that have these IDs
  const tourIDs = bookings.map((el) => el.tour);

  const tours = await Tour.find({ _id: { $in: tourIDs } });
  // it will select all the tours which have an ID which is in the tourIds

  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});

exports.updateUserData = async (req, res, next) => {
  console.log('update : ', req.body);
  console.log(req.user.id);
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
};

exports.verifyEmail = catchAsync(async (req, res, next) => {
  let { token } = req.query;
  console.log('line 99 view controller ' + token);
  // verify token
  let decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  let user = await User.findByIdAndUpdate(
    decoded.id,
    { verified: true },
    { new: true },
  );

  res.status(200).render('emailVerified', {
    title: 'Account Verification',
  });
});

exports.waitingVerification = catchAsync(async (req, res, next) => {
  res.status(200).render('waitingVerification', {
    title: 'Waiting for Email Verification',
  });
});
