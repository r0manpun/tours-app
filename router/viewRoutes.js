const express = require('express');
const viewController = require('../controller/viewController');
const authController = require('../controller/authController');
const bookingController = require('../controller/bookingController');

const router = express.Router();

// router.use(authController.isLoggedIn);

//rendering templates in pug
router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewController.getOverview,
);

router.get('/verify-email', viewController.verifyEmail);

router.get('/waiting-verification', viewController.waitingVerification);

router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);

router.get('/login', authController.isLoggedIn, viewController.getLoginForm);

router.get('/signup', authController.isLoggedIn, viewController.getSignUpForm);

router.get('/me', authController.authorize, viewController.getAccount);

router.get('/my-tours', authController.authorize, viewController.getMyTours);

router.post(
  '/submit-user-data',
  authController.authorize,
  viewController.updateUserData,
);

// router.get('/:userId/:booking')

module.exports = router;
