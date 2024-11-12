const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../model/bookingModel');
const Tour = require('../model/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');
const User = require('../model/userModel');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  console.log(tour.imageCover);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          unit_amount: tour.price,
          currency: 'usd',
          product_data: {
            name: `${tour.name} Tour`,
            description: `${tour.summary}`,
            images: [
              `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
            ],
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    mode: 'payment',
  });

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // this is ony TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) return next();

  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
});

// exports.createBooking = factory.createOne(Booking);

exports.createBooking = catchAsync(async (req, res, next) => {
  const { tourId, dateId, userId, price } = req.body;

  const tour = await Tour.findById(tourId);
  await tour.bookParticipant(dateId);

  const booking = await Booking.create({
    tour: tourId,
    user: userId,
    price,
  });

  res.status(201).json({
    status: 'success',
    data: {
      booking,
    },
  });
});

exports.getBooking = factory.getOne(Booking);

exports.getAllBookings = factory.getAll(Booking);

exports.deleteBooking = factory.deleteOne(Booking);

exports.updateBooking = factory.updateOne(Booking);

const checkBookings = (Modal) =>
  catchAsync(async (req, res, next) => {
    console.log(Modal);
    let id, user, tour, bookings;
    if (Modal === User) {
      id = req.params.userId;
      user = await Modal.findById(id);
      bookings = await Booking.find({ user: id });
    } else {
      id = req.params.tourId;
      tour = await Modal.findById(id);
      bookings = await Booking.find({ tour: id });
    }

    if (bookings.length === 0)
      return next(
        new AppError(
          `No bookings found for user: ${Modal === User ? user.name : tour.name}`,
        ),
      );

    res.status(200).json({
      status: 'success',
      bookings,
    });
  });

exports.getAllBookingsByUser = checkBookings(User);
exports.getAllBookingsByTour = checkBookings(Tour);
// exports.getAllBookingsByUser = catchAsync(async (req, res, next) => {
//   console.log(req.params);

//   const bookings = await Booking.findById(req.params.userId);

//   const user = await User.findById(req.params.userId);

//   if (!bookings)
//     return next(new AppError('No bookings found for user: ' + user.name));

//   res.status(200).json({
//     status: 'success',
//     bookings,
//   });
// });

// exports.getAllBookingsByTour = catchAsync(async (req, res, next) => {
//   const bookings = await Booking.findOne({ tour: req.params.tourId });

//   const tour = await Tour.findById(req.params.tourId);
//   console.log(bookings);

//   if (!bookings)
//     return next(new AppError('No bookings found in ' + tour.name + ' tour!'));

//   res.status(200).json({
//     status: 'success',
//     bookings,
//   });
// });
