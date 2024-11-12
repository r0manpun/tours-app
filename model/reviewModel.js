const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'a tour needs a rating'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    // whenever we have vituals property we want them to be shown in the output
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Preventing Duplicate Reviews: 1 review per 1 user for same 1 tour
reviewSchema.index({ user: 1, tour: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name',
  //   }).populate({
  //     path: 'user',
  //     select: 'name photo',
  //   });
  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

// using STATIC METHODS to calculate ratingsAverage and ratingsQuality
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // we can call aggregate in this static method
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour', //  select common field that all the document have
        nRatings: { $sum: 1 }, // number of ratings
        avgRating: { $avg: '$rating' },
      },
    },
  ]); // as this aggregate returns promise so we have to use await
  console.log(stats);

  // persist the stats to the Tour Model
  try {
    if (stats.length > 0) {
      await Tour.findByIdAndUpdate(tourId, {
        ratingsQuantity: stats[0].nRatings,
        ratingsAverage: stats[0].avgRating,
      });
    } else {
      await Tour.findByIdAndUpdate(tourId, {
        ratingsAverage: 4.5,
        ratingsQuantity: 0,
      });
    }
  } catch (err) {
    console.log(`Error updating tour stats:${err.message}`);
  }
};

// update document or ratings stats every time new review is added
// Post middleware to update ratings after save
reviewSchema.post('save', function () {
  //this points to current review

  // this.constructor; // this constructor is the model that created the document

  this.constructor.calcAverageRatings(this.tour);
  // Review.calcAverageRatings(this.tour);
});

// to update ratings every time the review is deleted
// Pre middleware to find document for findOneAndUpdate/Delete operations
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // results in 'Query was already executed' error, because technically this `find()` query executes twice.
  // const r = await this.findOne(); // Old mongoose version

  // const r =  this.clone() // new mongoose version
  // Can `clone()` the query to allow executing the query again

  // The clone() method in Mongoose creates a copy of the query, which allows you to execute the query again. However, this.clone() will still return a query object rather than the result of executing the query. You need to execute the cloned query to get the document.
  // this.r = await this.clone().findOne();
  // Fetch the document matching the current query's filter conditions
  this.r = await this.model.findOne(this.getFilter());
  console.log(this.r);
  next();
});

// Post middleware to update ratings after findOneAndUpdate/Delete operations
reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne()// does not work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

// TODO: Nested Routes
//  POST /tour/1234df3/reviews
//  GET /tour/1234df3/reviews
//  GET /tour/1234df3/reviews/123df12
