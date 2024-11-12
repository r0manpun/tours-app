const express = require('express');
const reviewController = require('../controller/reviewController');
const authController = require('../controller/authController');

const router = express.Router({ mergeParams: true });
// here the mergeParams will merge the tourId with the review router so we can access the path

router.use(authController.authorize);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.authenticateTo('user', 'lead-guide'),
    reviewController.setTourUserIds,
    reviewController.checkBookings,
    reviewController.createReview,
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(
    authController.authenticateTo('user', 'admin'),
    reviewController.deleteReview,
  )
  .patch(
    authController.authenticateTo('user', 'admin'),
    reviewController.updateReview,
  );

module.exports = router;
