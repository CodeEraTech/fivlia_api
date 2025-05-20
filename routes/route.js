const express = require('express');
const upload = require('../midllerware/multer');
const router = express.Router()
// const verifyToken = require('../midllerware/authToken');

const{users,addUser}=require('../controlers/authControler');
const {intro,getIntro}=require('../controlers/controlers')
const{update,banner,getBanner,addCategory,getCategories,brand,getBrand}=require('../controlers/categorycontroler');
const {addProduct,addAtribute,getAttributes,getProducts}=require('../controlers/ProductControler')
const cityZone = require('../modals/cityZone');
const { addCity,updateCityZones,deleteCity,deleteZoneFromCity,addState,getCity,getState,location } = require('../controlers/areaControler');

router.post('/add-category',upload,addCategory)
router.post('/products',upload,addProduct)
router.post('/intro',upload,intro)
router.post('/banner',upload,banner)
router.post('/brand',upload,brand)
router.post('/addAtribute',addAtribute)

router.post('/addCity',addCity)
router.post('/addState',addState)
router.post('/location', location)

router.get('/getIntro',getIntro)
router.get('/getBanner',getBanner)
router.get('/users',users)
router.get('/getCity',getCity)
router.get('/getState',getState)
router.get("/categories", getCategories);
router.get("/getBrand", getBrand);
router.get('/getAttributes',getAttributes)
router.get('/getProducts',getProducts)

router.post('/addUser',upload,addUser)
router.patch('/edit/:id',upload,update)
router.put('/updateCityZone', updateCityZones);
router.delete('/delete/:city', deleteCity);
router.put('/zone/delete', deleteZoneFromCity);


router.get('/zones', (req, res) => {
  res.json(cityZone);
});
module.exports=router;