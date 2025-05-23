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
]);