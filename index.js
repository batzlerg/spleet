const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const httpStatusCodes = require('http-status-codes');
const upload = require('./upload.js');
const fs = require('fs');
const rimraf = require('rimraf');
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
  // used for in-page confirmation of upload success
  const displayName = req.file.originalname.length > 30
    ? `${req.file.originalname.slice(0, 30)}...`
    : req.file.originalname;
  // create job object for the queue
  const queueObj = {
    file: req.file,
    displayName,
    fileId: `${req.file.filename.split(' ')[0]}-${req.file.size}`,
    inputModel: req.body.inputModel,
    pushSubscription: JSON.parse(req.body.pushSubscription)
  };
  // add job to queue
  q.push(cb => runQueueJob(queueObj, cb));
  // send page with necessary values from upload / queue
  res.render('index', {...queueObj, jobsAhead: q.length - 1});
  // notify the user of successful upload
  webpush.sendNotification(
    queueObj.pushSubscription,
    JSON.stringify({
      title: 'Your file has been uploaded successfully',
      fileId: queueObj.fileId
    })
  ).catch(err => console.error(err.stack))
});

// serve downloadable files from completed jobs folder
app.get('/download/:file', function(req, res) {
  res.download(`../downloads/${req.params.file}`);
});

// start server
app.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}`);
});

// this handles the heavy lifting of processing the file, running python, etc
function runQueueJob(job, cb) {
  // create per-job directory for spleeter output
  const fileNameNoExt = path.basename(
    job.file.filename,
    path.extname(job.file.filename)
  );
  const jobDir = path.join(__dirname, process.env.DOWNLOADS, fileNameNoExt);
  fs.mkdirSync(jobDir);
  console.log(`successfully created ${jobDir}`);

  // process upload via python script
  const options = {
    mode: 'text',
    pythonPath: process.env.PYTHON,
    args: [job.inputModel, job.file.path, jobDir]
  };
  let hasSentMsg = false;
  const onMsg = msg => {
    // console.log(`fromPython: ${msg}`);
    if (!hasSentMsg) {
      webpush.sendNotification(
        job.pushSubscription,
        JSON.stringify({
          title: 'Your file has begun processing!',
          fileId: job.fileId
        })
      );
      hasSentMsg = true;
    }
  };
  const onComplete = () => {
    const outputFile = `${job.file.filename}.zip`;
    zip(jobDir, path.join(__dirname, process.env.DOWNLOADS, outputFile))
      .then(() => {
        webpush.sendNotification(
          job.pushSubscription,
          JSON.stringify({
            title: 'Your file is ready!',
            download: `download/${outputFile}`,
            fileId: job.fileId
          })
        );
      })
      // clean up temp directory after files are zipped/ready for download
      .then(() => new Promise((resolve, reject) => {
        rimraf(jobDir, err => {
          if (err) {
            reject(err);
          }
          console.log(`successfully deleted ${jobDir}`);
          resolve();
        });
      }))
      .then(() => new Promise((resolve, reject) => {
        const uploadedFilePath = path.join(
          __dirname,
          process.env.UPLOADS,
          job.file.filename
        );
        fs.unlink(uploadedFilePath, err => {
          if (err) {
            reject(err);
          }
          console.log(`successfully deleted ${uploadedFilePath}`);
          resolve();
        });
      }))
      .then(cb)
      .catch((err) => {
        // todo: revisit
        if (err.stack) {
          console.error(err.stack);
        } else {
          console.error(err)
        }
        cb();
      });
  };
  runPython('spleet.py', options, { onMsg, onComplete });
  console.log('job initiated for: ', options.args);
}
