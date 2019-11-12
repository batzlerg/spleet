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

//// app stuff
const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');

//// used for web push notification
webpush.setVapidDetails(
  'mailto:graham@grahammak.es',
  process.env.PUBLIC_VAPID_KEY,
  process.env.PRIVATE_VAPID_KEY
);

//// queue notification
// todo: real queue
let fakeQueue = [];

//// routes
// todo: move routes to their own file
app.get('/', (req, res) => {
  res.render('index', { file: null });
});
app.post('/', upload.single('inputFile'), (req, res) => {
  const displayName = req.file.originalname.length > 20
    ? `${req.file.originalname.slice(0, 20)}...`
    : req.file.originalname;
  const queueObj = {
    file: req.file,
    displayName,
    inputModel: req.body.inputModel,
    pushSubscription: JSON.parse(req.body.pushSubscription)
  };
  fakeQueue.push(queueObj);
  runQueueJob();
  res.render('index', {...queueObj, jobsAhead: fakeQueue.length});
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

function runQueueJob() {
  let queueObj = fakeQueue[fakeQueue.length - 1];
  // todo: schedule / get specific job

  const fileNameNoExt = path.basename(
    queueObj.file.filename,
    path.extname(queueObj.file.filename)
  );
  const dir = path.join(__dirname, process.env.DOWNLOADS, fileNameNoExt);
  fs.mkdirSync(dir);

  const options = {
    mode: 'text',
    pythonPath: process.env.PYTHON,
    args: [queueObj.inputModel, queueObj.file.path, dir]
  };
  console.log(options.args);
  const callbacks = {
    onMsg: msg => console.log(`fromPython: ${msg}`),
    onComplete: () => {
      const outputFile = `${queueObj.file.filename}.zip`;
      const outputFilePath = path.join(__dirname, process.env.DOWNLOADS, outputFile);
      zip(dir, outputFilePath)
        .then(() => {
          // todo: outputFile to download link
          webpush.sendNotification(
            queueObj.pushSubscription,
            JSON.stringify({
              title: 'Your file is ready!',
              download: `download/${outputFile}`
            })
          );
        }).catch((err) => {
          // todo: revisit
          if (err.stack) {
            console.error(err.stack);
          } else {
            console.error(err)
          }
        })
    }
  };

  runPython('spleet.py', options, callbacks);
}
