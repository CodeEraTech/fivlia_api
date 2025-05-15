const express = require('express');
const upload = require('../midllerware/multer');
const router = express.Router()

const{users}=require('../controlers/authControler');
const {addSub,intro,banner,getIntro,getBanner}=require('../controlers/controlers')
const{update}=require('../controlers/categorycontroler');
const cityZone = require('../modals/cityZone');

router.post('/Product',upload,addSub)
router.post('/intro',upload,intro)
router.post('/banner',upload,banner)

router.get('/getIntro',getIntro)
router.get('/getBanner',getBanner)
router.get('/users',users)


router.patch('/edit/:id',upload,update)

router.get('/zones', (req, res) => {
  res.json(cityZone);
});
module.exports=router;