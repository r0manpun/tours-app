const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');

// TODO: For Later
// const startDateSchema = new mongoose.Schema({
//   date: {
//     type: Date,
//     required: true,
//   },
//   participants: {
//     type: Number,
//     default: 0,
//     required: [true, 'Participants cannot be less than 0'],
//   },
//   maxGroupSize: {
//     type: Number,
//     required: true,
//   },
//   soldOut: {
//     type: Boolean,
//     default: false,
//   },
// });

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [
        10,
        'A tour name must have greater or equal than 10 character',
      ],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // setter function which is going to be executed each
      // time there is a new value , for the ratings average field
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (value) {
          return value < this.price;
        },
        message: `Discount price ({VALUE}) should be below the regular price`,
      },
    },
    summary: {
      type: String,
      required: [true, 'A tour must have a description'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    // mongodb own geospatial data method
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number], // [lng, lat]
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ], // expects the type of each element of guides array to be a mongoDB ID
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//TODO: For Later
// Helper Method to Check Date Availability
// tourSchema.methods.isDateAvailable = function (selectedDateId) {
//   const dateInstance = this.startDates.id(selectedDateId);
//   return dateInstance && !dateInstance.soldOut;
// };

// // Helper Method to Book a Participant
// tourSchema.methods.bookParticipant = async function (selectedDateId) {
//   const dateInstance = this.startDates.id(selectedDateId);

//   if (!dateInstance) throw new Error('Date not found');

//   if (dateInstance.soldOut) throw new Error('This date is fully booked');

//   dateInstance.participants += 1;

//   if (dateInstance.participants >= dateInstance.maxGroupSize) {
//     dateInstance.soldOut = true;
//   }
// };

// IMPROVING READ PERFORMANCE with INDEXES
// tourSchema.index({ price: 1 });
//using COMPOUND INDEX

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });

// IMP: in order to be able to do geospatial queries, we need to first attribute index to the field where the geospatial data we are searching for is stored
tourSchema.index({ startLocation: '2dsphere' });
// for geospatial data the index needs to be 2d sphere index, if the data describes earth like sphere
// or instead we can use 2d index if we using fictional points on simple 2 dimensional plain

// Virtual Properties
// Virtuals are document properties that do not persist or get stored in the MongoDB
// database, they only exist logically and are not written to the document’s collection.

// With the get method of virtual property, we can set the value of the virtual
// property from existing document field values, and it returns the virtual property value.

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//TODO: imp Virtual populate Tours and Reviews
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // tour property of the review model
  localField: '_id', // this is called tour id in the foreign tour Model
});

//1) Document Middleware
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// on schema can have multiple document middlewareand hook(save,..)
/* tourSchema.pre('save', function (next) {
  console.log('Will save document...');
  next();
}); */

/* // Embedding the entire document of user not just id's
// save the guides property with the user
tourSchema.pre('save', async function (next) {
  const guidesPromises = this.guides.map(async (id) => await User.findById(id));
  this.guides = await Promise.all(guidesPromises);
  next();
}); */

//2) Query Middleware
// pre('find') hook . here find is a hook
tourSchema.pre(/^find/, function (next) {
  // hides the secret tour that we don't wanna show
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

// automatically populate the data with filterd data, so we don't need to
// write the populate method in the getTour query
tourSchema.pre(/^find/, function (next) {
  this.populate({ path: 'guides', select: '-__v -passwordChangedAt' });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  // run after all the query have been executed
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  // console.log(docs);
  next();
});

//3) Aggeration middleware
/* tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({
    $match: { secretTour: { $ne: true } },
  });
  //here we are using aggregate to hide the secretTour from the tour-stats
  next();
}); */

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
