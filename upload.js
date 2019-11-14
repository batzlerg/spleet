const Multer = require('multer');
const sanitize = require('sanitize-filename');

const storage = Multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOADS),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()} ${sanitize(file.originalname)}`),
  fileFilter: (req, file, cb) => {
    // quick & dirty check for size / MIME type support by ffmpeg via spleeter
    const size = file.size / 1024 / 1024;
    if (size > 10) {
      alert('Upload failed: file size cannot exceed 10 MB');
      file.value = null;
      return;
    }
    if (!/audio/.test(file.mimetype)) {
      return cb(new Error('Upload failed: only audio files are allowed'))
    }
    cb(null, true);
  }
});

module.exports = Multer({ storage });
