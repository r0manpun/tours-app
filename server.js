const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Catching Uncaught Exception
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  console.log(err.stack);
  process.exit(1);
}); // it should be put before we require our main application

dotenv.config({ path: './config.env' });

mongoose
  .connect(process.env.DATABASE_LOCAL)
  .then(() => console.log(`database connection successfull!!!`));

const app = require('./app');

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`app listening to port ${port}`);
});

// Unhandled Rejection usually occurs in the URL of any database or other third party apis
//  Handling Unhandled Rejections Errors
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection Errors 👻 :' + ' ' + err.name, err.message);
  console.log('UNHANDLED REJECTION 💥 Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});

// error like this is uncaught Exception
// console.log(x);
// this kind of error must be after the uncaught exception
