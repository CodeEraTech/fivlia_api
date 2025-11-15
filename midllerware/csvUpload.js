const multer = require("multer");

const storage = multer.diskStorage({
  destination: "uploads/temp",
  filename: (_, file, cb) => cb(null, Date.now() + ".csv"),
});

module.exports = multer({ storage }).single("file");
