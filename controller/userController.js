const multer = require('multer');
const sharp = require('sharp');
const User = require('../model/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const { promisify } = require('util');

// Multer
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     //we give each file unique name
//     // user-3432123nfa234ff-23423123sdf.jpeg
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

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

exports.uploadUserPhoto = upload.single('photo');

// Image processing in NodeJs
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

/**
 * Filter the object based on allowed fields
 * @param {object} obj // req.body
 * @param  {string} allowedFields // can be any other fields from req.body
 * @returns newObj that we allow to update for the user
 */
const filterObj = (obj, ...allowedFields) => {
  // create an empty object so that we can store the el from the allowed fields
  const newObj = {};

  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  // console.log(newObj);
  return newObj;
};

/* exports.getAllUsers = async (req, res, next) => {
  try {
    const tours = await User.find();

    res.status(200).json({
      status: 'success',
      message: 'all tours read successfully!',
      results: tours.length,
      data: {
        tours,
      },
    });
  } catch (err) {
    res.status(200).json({
      status: 'success',
      message: err,
    });
  }
}; */

exports.getAllUsers = factory.getAll(User);

exports.createUser = factory.createOne(User); // we don't actually make create user as it is in the signup middleware

exports.getMe = (req, res, next) => {
  // we get req.user from the authorize middleware
  req.params.id = req.user.id;
  next();
};

exports.getUser = factory.getOne(User);

exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);

// updating the current user data

exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.file);
  // console.log(req.body);
  // create error if user POST's password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Pleause use /update-password.',
        400,
      ),
    );
  }
  //update user document
  // const user = await User.findById(req.user.id);
  // user.name = 'Roman';
  // await user.save(); // if we do this we will get an error, so this save method is not useful in this middleware

  // that why we will use findByIdAndUpdate
  // filtered out unwanted field names that are not allowed to be updated
  const filterBody = filterObj(req.body, 'name', 'email');
  if (req.file) filterBody.photo = req.file.filename;

  // update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

/* 
Deleting the current user 
first, we have to make a new property in the schema 
a field called "active" with typeOf boolean
we don't want anyone to know the active flag is in our document

to basically delete the user we have to make the active flag false
*/

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

