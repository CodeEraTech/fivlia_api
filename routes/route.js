const express = require('express');
const upload = require('../midllerware/multer');
const router = express.Router()
// const verifyToken = require('../midllerware/authToken');

const { users, addUser } = require('../controlers/authControler');
const { intro, getIntro } = require('../controlers/controlers')
const { update, banner, getBanner, getAllBanner, updateBannerStatus, addCategory, getCategories, brand, getBrand, editCat } = require('../controlers/categorycontroler');
const { addProduct, addAtribute, getAttributes, getProduct, getFeatureProduct, searchProduct, bestSelling,editAttributes,unit,getUnit,addCart,getCart,getDicount,discount,getVarients } = require('../controlers/ProductControler')
const cityZone = require('../modals/cityZone');
const { addCity, updateCityStatus, getAviableCity, getCity, updateZoneStatus, getAllZone, getZone, location } = require('../controlers/areaControler');

router.post('/add-category', upload, addCategory)
router.post('/products', upload, addProduct)
router.post('/intro', upload, intro)
router.post('/banner', upload, banner)
router.post('/brand', upload, brand)
router.post('/addAtribute', addAtribute)
router.post('/unit', unit)
router.post('/addCart',upload, addCart)

router.post('/discount', discount)
router.post('/addCity', addCity)
router.post('/location', location)

router.get('/getIntro', getIntro)
router.get('/getAllZone', getAllZone)
router.get('/getZone', getZone)
router.get('/getBanner', getBanner)
router.get('/getAllBanner', getAllBanner)
router.get('/users', users)
router.get('/getCity', getCity)
router.get('/getAviableCity', getAviableCity)
router.get("/categories", getCategories);
router.get("/getBrand", getBrand);
router.get('/getAttributes', getAttributes)
router.get('/getProducts', getProduct)
router.get('/getFeatureProduct', getFeatureProduct)
router.get('/bestSelling', bestSelling)
router.get('/search', searchProduct)
router.get('/getUnit', getUnit)
router.get('/getCart', getCart)
router.get('/getDiscount', getDicount)
router.get('/getVarients/:id', getVarients)

router.post('/addUser', upload, addUser)
router.patch('/edit/:id', upload, update)
router.put('/updateCityStatus/:id', updateCityStatus);
router.patch('/admin/banner/:id/status', updateBannerStatus);
router.put('/updateZoneStatus/:id', updateZoneStatus);
router.patch('/editAttributes/:id', editAttributes);
router.put('/editCat/:id',upload, editCat);


router.get('/zones', (req, res) => {
  res.json(cityZone);
});
module.exports = router;