const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../config/aws");
const path = require("path");

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|svg|gif|webp|avif|pdf/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error("Invalid file type"));
};

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME, // e.g., 'goru-gallery'
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const originalName = path.basename(file.originalname, ext);
      if (file.fieldname === "ProductImages") {
        return cb(null, `ProductImages/${originalName}${ext}`);
      }

      const name = `${Date.now().toString()}-${file.fieldname}${ext}`;
      cb(null, `${file.fieldname}/${name}`);
    },
  }),
  fileFilter,
});

module.exports = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "ProductImages", maxCount: 100 },
  { name: "pdf", maxCount: 1 },
  { name: "brandDocument", maxCount: 1 },
  { name: "file", maxCount: 1 },
  { name: "gstCertificate", maxCount: 1 },
  { name: "MultipleImage", maxCount: 10 },
  { name: "Police_Verification_Copy", maxCount: 1 },
  { name: "aadharCard", maxCount: 2 },
  { name: "panCard", maxCount: 2 },
  { name: "drivingLicence", maxCount: 2 },
  { name: "var1", maxCount: 1 },
  { name: "var2", maxCount: 1 },
  { name: "var3", maxCount: 1 },
  { name: "var4", maxCount: 1 },
  { name: "var5", maxCount: 1 },
  { name: "var6", maxCount: 1 },
  { name: "var7", maxCount: 1 },
  { name: "var8", maxCount: 1 },
  { name: "var9", maxCount: 1 },
]);
