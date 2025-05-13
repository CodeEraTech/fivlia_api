const express = require('express');
const upload = require('../midllerware/multer');
const router = express.Router()

const {addSub,intro,banner,getIntro,getBanner}=require('../controlers/controlers')

router.post('/Product',upload.single('image'),addSub)
router.post('/intro',upload.single('image'),intro)
router.post('/banner',upload.single('image'),banner)
router.get('/getIntro',getIntro)
router.get('/getBanner',getBanner)
module.exports=router;