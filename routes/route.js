const express = require('express');
const upload = require('../midllerware/multer');
const router = express.Router()
const verifyToken = require('../midllerware/authToken');

const{users,addUser}=require('../controlers/authControler');
const {addSub,intro,getIntro}=require('../controlers/controlers')
const{update,banner,getBanner}=require('../controlers/categorycontroler');
const cityZone = require('../modals/cityZone');
const { addCity,updateCityZones,deleteCity,deleteZoneFromCity,addState,getCity,getState,getCityData,location,addCityData } = require('../controlers/areaControler');

router.post('/Product',upload,addSub)
router.post('/intro',upload,intro)
router.post('/banner',upload,banner)

router.post('/addCity',addCity)
router.post('/addCityData',addCityData)
router.post('/addState',addState)
router.post('/location',verifyToken, location)

router.get('/getIntro',getIntro)
router.get('/getBanner',getBanner)
router.get('/users',users)
router.get('/getCity',getCity)
router.get('/getCityData',getCityData)
router.get('/getState',getState)

router.post('/addUser',upload,addUser)
router.patch('/edit/:id',upload,update)
router.put('/updateCityZone', updateCityZones);
router.delete('/delete/:city', deleteCity);
router.put('/zone/delete', deleteZoneFromCity);


router.get('/zones', (req, res) => {
  res.json(cityZone);
});
module.exports=router;