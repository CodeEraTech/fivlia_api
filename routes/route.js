const express = require('express');
const upload = require('../midllerware/multer');
const router = express.Router()
// const verifyToken = require('../midllerware/authToken');

const{users,addUser}=require('../controlers/authControler');
const {intro,getIntro}=require('../controlers/controlers')
const{update,banner,getBanner,getAllBanner,updateBannerStatus,addCategory,getCategories,brand,getBrand}=require('../controlers/categorycontroler');
const {addProduct,addAtribute,getAttributes,getProduct,getFeatureProduct,searchProduct}=require('../controlers/ProductControler')
const cityZone = require('../modals/cityZone');
const { addCity,updateCityStatus,getAviableCity,getCity,deleteCity,deleteZoneFromCity,addState,getState,location } = require('../controlers/areaControler');

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
router.get('/getAllBanner',getAllBanner)
router.get('/users',users)
router.get('/getCity',getCity)
router.get('/getAviableCity',getAviableCity)
router.get('/getState',getState)
router.get("/categories", getCategories);
router.get("/getBrand", getBrand);
router.get('/getAttributes',getAttributes)
router.get('/getProducts',getProduct)
router.get('/getFeatureProduct',getFeatureProduct)
router.get('/search',searchProduct)

router.post('/addUser',upload,addUser)
router.patch('/edit/:id',upload,update)
router.put('/updateCityStatus/:id', updateCityStatus);
router.delete('/delete/:city', deleteCity);
router.put('/zone/delete', deleteZoneFromCity);
router.patch('/admin/banner/:id/status', updateBannerStatus);

router.get('/zones', (req, res) => {
  res.json(cityZone);
});
module.exports=router;