const express = require('express');
const tourController = require('../controller/tourController');
const authController = require('../controller/authController');
// const reviewController = require('../controller/reviewController');
const bookingController = require('./../controller/bookingController');
const reviewRoutes = require('./reviewRoutes');

const router = express.Router({ mergeParams: true });

// mounting a router to review router
router.use('/:tourId/reviews', reviewRoutes);

router
  .route('/top-5-tours')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);

// Geospatial Querires Finding the Tours within Radius
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// using query string
// /tours-within?distance=233,&center=-45,40&unit=mi
// /tours-within/233/center/-40,45/unit/mi

// Geospatial Aggregation Calculating Disatances
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router.use(authController.authorize);

router
  .route('/monthly-plan/:year')
  .get(
    authController.authenticateTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );

router.route('/:id').get(tourController.getTour);

router.use(authController.authenticateTo('admin', 'lead-guide'));

router
  .route('/')
  .post(tourController.createTour)
  .get(tourController.getAllTours);

router
  .route('/:id')
  .patch(
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    tourController.deleteTour,
  );

// Nested route for review
// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.authorize,
//     authController.authenticateTo('user'),
//     reviewController.createReview,
//   );

router.route('/:tourId/bookings').get(bookingController.getAllBookingsByTour);

module.exports = router;
