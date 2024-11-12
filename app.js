const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
// view wala
const path = require('path');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controller/errorController');
const tourRoutes = require('./router/tourRoutes');
const userRoutes = require('./router/userRoutes');
const reviewRoutes = require('./router/reviewRoutes');
const viewRouter = require('./router/viewRoutes');
const bookingRouter = require('./router/bookingRoutes');

const app = express();
// console.log(process.env);

// set pug in express, template engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//1) Global middleware
// serving static files
app.use(express.static(path.join(__dirname, 'public')));

// A) setting security HTTP headers with helmet package
app.use(helmet({ contentSecurityPolicy: false }));

// B) limiting the request
const limiter = rateLimit({
  max: 100, // request per ip
  windowMs: 60 * 60 * 1000, // allows 100 req from the same ip for 1 hour
  message: 'Too many requests from this IP, please try again in an hour', // if there more then 100 req per hour
});

app.use('/api', limiter);

// C) Body parser, reading data from the body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data Sanitization against NOSQL queery injection
// we can use this mongoDb query code to login withour the email
// "email": { "$gt": "" }
app.use(mongoSanitize());
// this will remove all the $ sign from the query

// Data sanitization against XSS
app.use(xss()); // will clean any user input from malicious html code with some js code attached to it

// prevent parameter pollution
// hpp - http parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ], // array of properties for which we allow duplicates in the query string
  }),
);
// it will basically remove the duplicate query string from the parameter
// if there is 2 or more duplicate query it will always use the last one to request

// D) Development Logging
if (process.env.NODE_ENV.trim() === 'production') {
  app.use(morgan('dev'));
}

// E) test middleware, adds the request time to the request body
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// console.log('app.js line 85: ' + process.env.STRIPE_SECRET_KEY);
// console.log('app.js line 86: ' + process.env.STRIPE_PUBLIC_KEY);

// Routes
app.use('/', viewRouter);

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/tours', tourRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/bookings', bookingRouter);

// Global error handling middleware for route

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
