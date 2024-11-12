const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../model/tourModel');
const ApiFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// Multer
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]); // when there is multiple fields and files

// upload.single('image') when there is single file
// upload.array('images', 5); when there is multiple files with same field name

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  console.log(req.files);

  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover Image
  // const imageCoverFilename = `tour-${req.params.id}-${Date.noew()}-cover.jpeg`;
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);
  // req.body.imageCover = imageCoverFilename;

  // 2) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    }),
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.select = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

/* exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);

  res.status(201).json({
    status: 'success',
    message: 'tour created successfully!',
    data: {
      tour: newTour,
    },
  });
});*/
exports.createTour = factory.createOne(Tour);

/* exports.getAllTours = catchAsync(async (req, res, next) => {
  // console.log(req.query);
  /*  
  This code will return nothing or undefined or null object
  because the select, sort , skip ,limit function takes the input of 
  req.query.select, req.query.sort,req.query.page,req.query.limit which is undefined 
  and so the code returns the empty or null object or array
  if there is no query in the url

  const tours = await Tour.find()
      .select(req.query.select.split(',').join(' '))
      .sort(req.query.sort.split(',').join(' '))
      .skip((req.query.page * 1 || 1 - 1) * req.query.limit * 1 || 100)
      .limit(req.query.limit * 1 || 100);
 */
//     //TODO:
//     // Filtering
//     const queryObj = { ...req.query };
//     const excludedFields = ['page', 'sort', 'limit', 'fields', 'select']; // fields or select
//     excludedFields.forEach((el) => delete queryObj[el]);
//     console.log(req.query, queryObj);

//     // Advance Filtering
//     let queryStr = JSON.stringify(queryObj);
//     console.log(queryStr);
//     queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
//     console.log(JSON.parse(queryStr));

//     const query = Tour.find(JSON.parse(queryStr));
// //TODO:
/*  const features = new ApiFeatures(Tour.find(), req.query)
    .filter()
    .select()
    .sort()
    .paginate(); */
/*
     API Features :-> select: fields, sort, limit, skip:- main pagination
    req.query.select:-> fields
    req.query.sort:-> ascending, descending, greater than = gt, greater then or equal to = gte, less than = lt, less then or equal to = lte
    req.query.page:-> no of pages for the datas
    req.query.limit:-> no of data per page 
    we also can filter by writing directly inside the query ie. Tour.find(filterObj)

    page and limit has datatype of string, we have to change them into number so we multiply them with 1 
    ie. req.query.page * 1, req.query.limit * 1

    for the actual pagination we use skip method
    for that we have formula 
    ie. (page * 1 || 1 - 1) * limit * 1 || <or any number>
    */

/*  const query = Tour.find();

    if (req.query.select) {
      // fields or select
      // Handle select
      const fields = req.query.select.split(',').join(' ');
      query.select(fields);
    }
    if (req.query.sort) {
      console.log(req.query.sort);
      // Handle sort
      const sortBy = req.query.sort.split(',').join(' ');
      query.sort(sortBy);
    }

    // Handle pagination
    const limit = req.query.limit * 1 || 2;
    const page = req.query.page * 1 || 1;
    const skip = (page - 1) * limit;
    query.skip(skip).limit(limit);
 */
// at last await the query
// const tours = await query;
/*   const tours = await features.query;

  if (tours.length === 0) throw new Error('Page not found');

  res.status(200).json({
    status: 'success',
    message: 'all tours read successfully!',
    results: tours.length,
    data: {
      tours,
    },
  }); 
}); */
exports.getAllTours = factory.getAll(Tour);

/* exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id).populate('reviews');
  //   .populate({
  //   path: 'guides',
  //   select: '-__v -passwordChangedAt',
  // });
  // populating tour guides, only in the query but not in the database
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'specific tour read successfully!',
    data: {
      tour,
    },
  });
}); */
exports.getTour = factory.getOne(Tour, { path: 'reviews' });

/* exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    message: 'specific tour read successfully!',
    data: {
      tour,
    },
  });
});  */
exports.updateTour = factory.updateOne(Tour);

/* exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id, {
    new: true,
  });
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'tour deleted successfully!',
    data: null,
  });
}); */

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 3 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numOfTours: { $sum: 1 },
        numOfRatings: {
          $sum: '$ratingsQuantity',
        },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        maxPrice: { $max: '$price' },
        minPrice: { $min: '$price' },
      },
    },
    {
      $sort: {
        avgPrice: -1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    message: 'get tour stats',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $gte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: {
        // month: '$_id'
        month: {
          // use to compare the digits with words to display month short name
          $arrayElemAt: [
            // prettier-ignore
            [
                '','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec',
              ],
            '$_id',
          ],
        },
      },
    },
    {
      $sort: {
        _id: 1,
        // numTourStarts: -1
      },
    },
    {
      $limit: 12,
    },
    {
      $project: { _id: 0 }, // makes id no longer show up
    },
  ]);

  res.status(200).json({
    status: 'success',
    message: 'monthly plan',
    data: {
      plan,
    },
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/-40,45/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;

  //destructuring latlng
  const [lat, lng] = latlng.split(',');

  // defining radius
  // radius is the distance that we have as the radius but converted into a special unit radiance
  // to get the radiance we need to divide the distance by the radius of the earth
  //  radius of earth is 3963.2 in miles, 6378.1 in km
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400,
      ),
    );
  }

  console.log(distance, lat, lng, unit);

  // query for geospatial
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

// /distances/:latlng/unit/:unit
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400,
      ),
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      }, // only geospatial aggregration pipeline that exists
      // always need to be the first stage
      // it requires one of the field that contains geospatial index
      // if there is only one field with geospatial index it will automatically use that index in order to perform the calculation
      // if there are multiple field with geospatial index then we need to use keys parameter to define the field that we want to calculate
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});

//TODO: For Later
// exports.checkDateAvailability = catchAsync(async (req, res, next) => {
//   const { tourId, dateId } = req.params;
//   const tour = await Tour.findById(tourId);

//   if (!tour || !tour.isDateAvailable(dateId)) {
//     return res
//       .status(400)
//       .json({ status: 'success', message: 'Selected date is fully booked' });
//   }
//   res.status(200).json({ status: 'success', message: 'Date is available' });
// });
