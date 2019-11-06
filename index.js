const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const httpStatusCodes = require('http-status-codes');
const upload = require('./upload.js');
const runPython = require('./pyshell.js');
const fs = require('fs');
const path = require('path');

//// app stuff
const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"));

//// routes
// todo: move routes to their own file
app.get('/', (req, res) => {
  res.sendFile("./public/index.html");
});
app.post('/upload', upload.single('inputFile'), (req, res) => {
  // todo: real page content
  res.render('index', {
    filename: req.file.originalname,
    model: req.body.inputModel // todo: validate req.body.inputModel enum
  });

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
    onComplete: () => {}
  };

  runPython('spleet.py', options, callbacks);
});

app.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}`);
});
