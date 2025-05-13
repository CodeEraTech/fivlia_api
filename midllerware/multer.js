// middleware/multer.js
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Only accept images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed!'), false);
  }
};

const dir = path.join(__dirname, '../uploads');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

const upload = multer({ storage, fileFilter });
module.exports = upload;
