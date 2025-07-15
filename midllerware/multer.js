const multer = require('multer');
const{CloudinaryStorage} = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary,
    params:{
        folder:"goru-Gallery",
        allowed_formats:['jpg','png','jpeg','svg','gif','webp','avif']
    }
})

const upload = multer({storage});

module.exports = upload.fields([
{ name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'MultipleImage', maxCount: 10 },
  { name: 'Police_Verification_Copy', maxCount: 1 },
  { name: 'aadharCard', maxCount: 2 },
  { name: 'drivingLicence', maxCount: 2 },
   { name: 'var1', maxCount: 1 },
  { name: 'var2', maxCount: 1 },
  { name: 'var3', maxCount: 1 },
   { name: 'var4', maxCount: 1 },
  { name: 'var5', maxCount: 1 },
  { name: 'var6', maxCount: 1 },
   { name: 'var7', maxCount: 1 },
  { name: 'var8', maxCount: 1 },
  { name: 'var9', maxCount: 1 }
]);