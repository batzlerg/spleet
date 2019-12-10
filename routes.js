const fs = require('fs');
const path = require('path');
const runPython = require('./pyshell');
const zip = require('./zip');
const webpush = require('web-push');
const upload = require('./upload');

const queue = require('queue');
const q = queue({ autostart: true });

const express = require('express');
const router = express.Router();

router.get(`/`, (req, res) => {
  res.render('index', { file: null });
});

// main route, where all the magic happens
router.post(`/${process.env.SUBDOMAIN}`, upload.single('inputFile'), (req, res) => {
  console.log(req.body);
  // displayName is used for in-page confirmation of upload success
  const origName = req.file.originalname;
  const displayName = origName.length > 30
    ? `${origName.slice(0, 30)}...`
    : origName;

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
  // todo: firefox is buggy handling service workers between page reloads
  // handle upload via ajax and return values only instead of EJS rendered page
  res.render('index', {...queueObj, jobsAhead: q.length - 1});

  // notify the user of successful upload
  try {
    webpush.sendNotification(
      queueObj.pushSubscription,
      JSON.stringify({
        title: 'Your file has been uploaded successfully',
        fileId: queueObj.fileId
      })
    );
  } catch(err) {
    handleErr(err);
  }
});

// serve downloadable files from completed jobs folder
router.get(`/${process.env.SUBDOMAIN}/download/:file`, function(req, res) {
  res.download(`../downloads/${req.params.file}`);
});

// this handles the heavy lifting of processing the file, running python, etc
// broken out to its own function for legibility
function runQueueJob(job, cb) {
  // create per-job directory for spleeter output
  const fileNameNoExt = path.basename(
    job.file.filename,
    path.extname(job.file.filename)
  );
  const jobDir = path.join(__dirname, process.env.DOWNLOADS, fileNameNoExt);
  fs.mkdirSync(jobDir);
  console.log(`${job.fileId}: successfully created ${jobDir}`);

  // selectively examine python stderr output (not stdout, tensorflow is weird)
  // so we can alert the user when the script begins processing
  let hasSentMsg = false;
  const onMsg = msg => {
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

  // callback for python script completion
  const onComplete = async () => {
    const outputFile = `${job.file.filename}.zip`;
    const outputFilePath = path.join(
      __dirname,
      process.env.DOWNLOADS,
      outputFile
    );
    const inputFilePath = path.join(
      __dirname,
      process.env.UPLOADS,
      job.file.filename
    );

    // zip file for download convenience (and bandwidth)
    try {
      await zip(jobDir, outputFilePath);
      console.log(`${job.fileId}: successfully zipped ${outputFilePath}`);

      // notify of completion
      webpush.sendNotification(
        job.pushSubscription,
        JSON.stringify({
          title: 'Your file is ready!',
          download: `download/${outputFile}`,
          fileId: job.fileId
        })
      );
    } catch (err) {
      handleError(err);
    }

    // delete temp directory after files are zipped/ready for download
    try {
      await fs.promises.rmdir(jobDir, { recursive: true });
      console.log(`${job.fileId}: successfully deleted ${jobDir}`);
    } catch (err) {
      handleError(err);
    }

    // delete uploaded file
    try {
      await fs.promises.unlink(inputFilePath);
      console.log(`${job.fileId}: successfully deleted ${inputFilePath}`);
    } catch (err) {
      handleErr(err);
    }

    // schedule deletion of zipped downloadable
    setInterval(async () => {
      try {
        await fs.promises.unlink(outputFilePath);
        console.log(`${job.fileId}: successfully deleted ${outputFilePath}`);
      } catch (err) {
        handleErr(err);
      }
    }, 7200000); // 2 hours in ms

    // complete job and allow the queue to advance
    cb();
  };

  // run the actual python script
  const options = {
    mode: 'text',
    pythonPath: process.env.PYTHON,
    args: [job.inputModel, job.file.path, jobDir]
  };
  runPython('spleet.py', options, { onMsg, onComplete });
  console.log('job initiated for: ', options.args);
}

// helper for consistent error handling
function handleError() {
  if (err.stack) {
    console.error(err.stack);
  } else {
    console.error(err)
  }
}

module.exports = router;
