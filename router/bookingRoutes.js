const express = require('express');
const bookingController = require('./../controller/bookingController');
const authController = require('./../controller/authController');
const tourController = require('./../controller/tourController');

const router = express.Router();

router.use(authController.authorize); // protect , only show when the user is logged in

router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

//TODO: For Later  
//  router.route('/check-date-availability/:tourId/:dateId')
//   .get(tourController.checkDateAvailability); 

router.use(authController.authenticateTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);
router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
