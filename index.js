const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const webpush = require('web-push');

// set key info for push notifications
webpush.setVapidDetails(
  'mailto:graham@grahammak.es',
  process.env.PUBLIC_VAPID_KEY,
  process.env.PRIVATE_VAPID_KEY
);

//// app stuff
const app = express();
app.use(express.static("public"));
app.use(require('./routes'));
app.set('view engine', 'ejs');

// start server
app.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}`);
});
