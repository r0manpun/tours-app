const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const { promisify } = require('util');
const catchAsync = require('../utils/catchAsync');

exports.verifyJWT = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return new AppError('Unauthorized', 401);
  }

  const token = authHeader.split(' ')[1];

  const decoded = await promisify(jwt.verify)(token, process.env.JWT.SECRET);

  req.id = decoded.id;

  next();
});
