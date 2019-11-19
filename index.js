const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

// set key info for push notifications
webpush.setVapidDetails(
  'mailto:graham@grahammak.es',
  process.env.PUBLIC_VAPID_KEY,
  process.env.PRIVATE_VAPID_KEY
);

//// bootstrap
(async function() {
  const bootstrapPaths = [
    path.join(__dirname, process.env.UPLOADS),
    path.join(__dirname, process.env.DOWNLOADS)
  ];
  for (let p of bootstrapPaths) {
    try {
      await fs.promises.access(p); // test whether dir exists
    } catch {
      fs.promises.mkdir(p); // if not, promise is rejected and we need to create
    }
  }
})();

//// app stuff
const app = express();
app.use(express.static("public"));
app.use(require('./routes'));
app.set('view engine', 'ejs');

// start server
app.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}`);
});
