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
app.use(express.static("public"));

//// routes
// todo: move routes to their own file
app.get('/', (req, res) => {
  res.sendFile('index.html');
});
app.post('/upload', upload.single('inputFile'), (req, res) => {
  let pageVars = {
    filename: req.file.originalname,
    model: req.body.inputModel, // todo: validate req.body.inputModel enum
    download: null
  };

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
          // todo: web socket push
          res.send({
            download: outputFile
          });
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
