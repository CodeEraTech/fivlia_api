const express = require('express');
const upload = require('../midllerware/multer');
const router = express.Router()

const{users,addUser}=require('../controlers/authControler');
const {addSub,intro,banner,getIntro,getBanner}=require('../controlers/controlers')
const{update}=require('../controlers/categorycontroler');
const cityZone = require('../modals/cityZone');
const { addCity } = require('../controlers/areaControler');

router.post('/Product',upload,addSub)
router.post('/intro',upload,intro)
router.post('/banner',upload,banner)

router.post('/addCity',addCity)

router.get('/getIntro',getIntro)
router.get('/getBanner',getBanner)
router.get('/users',users)

router.post('/addUser',upload,addUser)
router.patch('/edit/:id',upload,update)

router.get('/zones', (req, res) => {
  res.json(cityZone);
});
module.exports=router;