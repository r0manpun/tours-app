const express = require('express');
const userController = require('../controller/userController');
const authController = require('../controller/authController');
const bookingController = require('../controller/bookingController');

// const multer = require('multer');
// const upload = multer({ dest: 'public/img/users' });

const router = express.Router({ mergeParams: true });

router.post('/signup', authController.signUp);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/refresh-token', authController.refreshAccessToken);

router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

router.get(
  '/check-verification-status',
  authController.checkVerificationStatus,
);

// adding authorize all the routes after this line
router.use(authController.authorize); // as it is a middleware function, just like other middleware
// we can use it like this
// to protect the routes we can use middleware function
// before all the routes that need to authenticate

router.patch('/update-password', authController.updatePassword);

router.get('/me', userController.getMe, userController.getUser);

router.patch(
  '/update-me',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);

router.delete('/delete-me', userController.deleteMe);

router.route('/:userId/bookings').get(bookingController.getAllBookingsByUser);

router.use(authController.authenticateTo('admin'));

router
  .route('/')
  .post(userController.createUser)
  .get(userController.getAllUsers);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
