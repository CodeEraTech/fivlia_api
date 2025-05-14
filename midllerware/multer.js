const multer = require('multer');
const{CloudinaryStorage} = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary,
    params:{
        folder:"goru-Gallery",
        allowed_format:['jpg','png','jpeg','svg','gif','webp','avif']
    }
})

const upload = multer({storage});

module.exports=upload;