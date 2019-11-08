const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const httpStatusCodes = require('http-status-codes');
const upload = require('./upload.js');
const fs = require('fs');
const path = require('path');
const runPython = require('./pyshell.js');
const zip = require('./zip.js');

//// app stuff
const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"));

//// routes
// todo: move routes to their own file
app.get('/', (req, res) => {
  let pageVars = {
    download: null
  };
  res.render('index', pageVars);
});
app.post('/upload', upload.single('inputFile'), (req, res) => {
  let pageVars = {
    filename: req.file.originalname,
    model: req.body.inputModel, // todo: validate req.body.inputModel enum
    download: null
  };

  // todo: real page content
  // res.render('index', pageVars);

  const fileNameNoExt = path.basename(
    req.file.filename,
    path.extname(req.file.filename)
  );
  const dir = path.join(__dirname, process.env.DOWNLOADS, fileNameNoExt);
  fs.mkdirSync(dir);

  const options = {
    mode: 'text',
    pythonPath: process.env.PYTHON,
    args: [req.body.inputModel, req.file.path, dir]
  };
  const callbacks = {
    onMsg: msg => console.log(`fromPython: ${msg}`),
    onComplete: () => {
      const outputFile = path.join(__dirname, process.env.DOWNLOADS, `${req.file.originalname}.zip`);
      zip(dir, outputFile)
        .then(() => {
          pageVars.download = outputFile;
          res.render('index', pageVars);
        }).catch(() => {
          //err
        })
    }
  };

  runPython('spleet.py', options, callbacks);
});

app.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}`);
});
