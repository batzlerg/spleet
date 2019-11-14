const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const httpStatusCodes = require('http-status-codes');
const upload = require('./upload.js');
const fs = require('fs');
const path = require('path');
const runPython = require('./pyshell.js');
const zip = require('./zip.js');
const webpush = require('web-push');
const queue = require('queue');
let q = queue({ autostart: true });

//// used for web push notification
webpush.setVapidDetails(
  'mailto:graham@grahammak.es',
  process.env.PUBLIC_VAPID_KEY,
  process.env.PRIVATE_VAPID_KEY
);

//// app stuff
const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');

//// routes
// todo: move routes to their own file
app.get('/', (req, res) => {
  res.render('index', { file: null });
});
app.post('/', upload.single('inputFile'), (req, res) => {
  const displayName = req.file.originalname.length > 30
    ? `${req.file.originalname.slice(0, 30)}...`
    : req.file.originalname;
  const queueObj = {
    file: req.file,
    displayName,
    inputModel: req.body.inputModel,
    pushSubscription: JSON.parse(req.body.pushSubscription)
  };
  q.push(cb => {
    runQueueJob(queueObj, cb);
  });
  res.render('index', {...queueObj, jobsAhead: q.length - 1});
  webpush.sendNotification(
    queueObj.pushSubscription,
    JSON.stringify({ title: 'Your file has been uploaded successfully' })
  ).catch(err => console.error(err.stack))
});
app.get('/download/:file', function(req, res) {
  res.download(`../downloads/${req.params.file}`);
});

app.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}`);
});

function runQueueJob(job, cb) {
  const fileNameNoExt = path.basename(
    job.file.filename,
    path.extname(job.file.filename)
  );
  const dir = path.join(__dirname, process.env.DOWNLOADS, fileNameNoExt);
  fs.mkdirSync(dir);

  const options = {
    mode: 'text',
    pythonPath: process.env.PYTHON,
    args: [job.inputModel, job.file.path, dir]
  };
  console.log(options.args);
  const callbacks = {
    onMsg: msg => console.log(`fromPython: ${msg}`),
    onComplete: () => {
      const outputFile = `${job.file.filename}.zip`;
      const outputFilePath = path.join(__dirname, process.env.DOWNLOADS, outputFile);
      zip(dir, outputFilePath)
        .then(() => {
          // todo: outputFile to download link
          webpush.sendNotification(
            job.pushSubscription,
            JSON.stringify({
              title: 'Your file is ready!',
              download: `download/${outputFile}`
            })
          );
        })
        .then(cb)
        .catch((err) => {
          // todo: revisit
          if (err.stack) {
            console.error(err.stack);
          } else {
            console.error(err)
          }
          cb();
        })
    }
  };

  runPython('spleet.py', options, callbacks);
}
