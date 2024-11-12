const Booking = require('../model/bookingModel');
const Review = require('../model/reviewModel');
const ApiFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

/* exports.createReview = catchAsync(async (req, res, next) => {
  // after nested route with  tour, allow

  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;

  // before nested route
  const review = await Review.create(req.body);

  res.status(201).json({
    status: 'success',
    message: 'review created',
    data: {
      review,
    },
  });
}); */

/* exports.getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.tourId) filter = { tour: req.params.tourId };

  const features = new ApiFeatures(Review.find(filter), req.query)
    .select()
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const reviews = await features.query;

  if (!reviews.length === 0) {
    return next(new AppError('Page not found!', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'all reviews read',
    totalReviews: reviews.length,
    data: {
      reviews,
    },
  });
}); */

exports.getAllReviews = factory.getAll(Review);
/* exports.getReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'specific review read successfully!',
    data: {
      review,
    },
  });
}); */

exports.getReview = factory.getOne(Review);

exports.setTourUserIds = (req, res, next) => {
  // allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

exports.checkBookings = catchAsync(async (req, res, next) => {
  const { tour, user } = req.body;
  console.log(req.body);

  const bookings = await Booking.findOne({ tour, user });
  console.log(bookings);

  if (!bookings)
    return next(new AppError("You can only review tours you've booked"));

  next();
});

exports.createReview = factory.createOne(Review);

exports.updateReview = factory.updateOne(Review);

exports.deleteReview = factory.deleteOne(Review);
