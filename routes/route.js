const express = require('express');
const upload = require('../midllerware/multer');
const router = express.Router()

const {addSub,intro,getIntro}=require('../controlers/controlers')

router.post('/Product',upload.single('image'),addSub)
router.post('/intro',upload.single('image'),intro)
router.get('/getIntro',getIntro)
module.exports=router;