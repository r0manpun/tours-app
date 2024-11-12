const AppError = require('../utils/appError');

// Handling Error in Production by Error Name
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const error = { ...err.errorResponse };
  const value = error.errmsg.match(/(["'])(\\?.)*?\1/)[0];

  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  console.log(errors);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = (err) => {
  return new AppError('Invalid token. Please log in again!', 401);
};

const handleJWTExpiredError = (err) => {
  return new AppError('Your token has expired! Please log in again.', 401);
};

// Handling Error for Development
const sendErrorDev = (err, req, res) => {
  if (!req.originalUrl) {
    console.error('originalUrl is undefined on the request object');
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
    return;
  }
  // API
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode * 1).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // RENDERED WEBSITE
    console.error('Error 💥', err);

    res.status(err.statusCode * 1).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
};

// Handling Error for Production
const sendErrorProd = (err, req, res) => {
  //  A) API
  if (req.originalUrl.startsWith('/api')) {
    //Operational, trusted error: send message to the client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('Error 💥', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
      error: err,
    });
  }

  // B) RENDERED WEBSITE
  if (err.isOperational) {
    res.status(err.statusCode * 1).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  } else {
    // B) Send generic message
    res.status(err.statusCode * 1).render('error', {
      title: 'Something went wrong!',
      msg: 'Please try again later.',
    });
  }
};
// Global Error Handler
module.exports = (err, req, res, next) => {
  // console.log(err);

  err.status = err.status || 'error';
  err.statusCode = err.statusCode || '500';

  // Errors During Development and Production
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV.trim() === 'production') {
    let error = { ...err };
    // explicitly copying error name as all the err properties were not copied like name,..etc
    error.name = err.name;
    error.message = err.message;
    // console.log(error);

    if (error.name === 'CastError') {
      error = handleCastErrorDB(error);
    }
    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if (error.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }
    sendErrorProd(error, req, res);
  }
};
