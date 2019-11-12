const Multer = require('multer');
const sanitize = require('sanitize-filename');

const storage = Multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOADS),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()} ${sanitize(file.originalname)}`)
});

module.exports = Multer({ storage });
