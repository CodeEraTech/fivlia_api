const express = require('express');
const upload = require('../midllerware/multer');
const router = express.Router()
const verifyToken = require('../midllerware/authToken');
//abc
const {getDeliveryEstimate} = require('../controlers/DeliveryControler')

const { createStore,getStore,addCategoryInStore,removeCategoryInStore } = require('../controlers/storeControler');

const { settings,addSettings,adminSetting } = require('../controlers/settingControler');
const { users, addUser,updateProfile,Login,signin,register,verifyMobile } = require('../controlers/authControler');

const { intro, getIntro } = require('../controlers/controlers')

const { placeOrder, getOrders,orderStatus,test,driver,getDriver,verifyPayment,getOrderDetails,deliveryStatus,updatedeliveryStatus,getdeliveryStatus} = require('../controlers/orderControler')

const { addCart,getCart,getDicount,discount,quantity,deleteCart } = require('../controlers/cartControler')

const { update, banner, getBanner, getAllBanner, updateBannerStatus, addCategory, getCategories, brand, getBrand, editCat,updateAt,editBrand,addFilter,editFilter,getFilter,deleteFilter,deleteFilterVal,addFiltersToCategory } = require('../controlers/categorycontroler');

const { addProduct, addAtribute, getAttributes, getProduct, getFeatureProduct, searchProduct, bestSelling,editAttributes,unit,getUnit,getVarients,filter,bulkProductUpload,updateProduct,deleteProduct,getAttributesId,notification,getNotification,getRelatedProducts,updateStock,adminProducts,deleteAttribute } = require('../controlers/ProductControler')

const cityZone = require('../modals/cityZone');
const { addCity, updateCityStatus, getAviableCity, getCity, updateZoneStatus, getAllZone, getZone, updateLocation,addAddress,getAddress,EditAddress,deleteAddress,setDefault } = require('../controlers/areaControler');

router.post('/Login', Login)
router.post('/signin', signin)
router.post('/register', register)
router.post('/verifyMobile', verifyMobile)
router.post('/add-category', upload, addCategory)
router.post('/products', upload, addProduct)
router.post('/intro', upload, intro)
router.post('/banner', upload, banner)
router.post('/brand', upload, brand)
router.post('/addAtribute', addAtribute)
router.post('/unit', unit)
router.post('/addCart',upload,verifyToken, addCart)
router.post('/placeOrder', placeOrder);
router.post('/verifyPayment', verifyPayment);
router.post('/filter',filter)
router.post('/addSettings',addSettings)
router.post('/createStore',upload,createStore)
router.post('/Product/bulk',upload,bulkProductUpload),
router.post('/adminSetting', adminSetting)
router.post('/addFilter', addFilter)
router.post('/address',verifyToken, addAddress);
router.post('/updateStock/:productId', updateStock);
router.post('/driver',upload, driver);
router.post('/deliveryStatus',upload, deliveryStatus);

router.post('/discount', discount)
router.post('/addCity', addCity)
router.post('/location',verifyToken, updateLocation)
router.post('/notification',upload, notification)

router.get('/getNotification',verifyToken, getNotification)
router.get('/getOrderDetails',verifyToken, getOrderDetails)
router.get('/getDriver', getDriver)
router.get('/getIntro', getIntro)
router.get('/getAllZone', getAllZone)
router.get('/getZone', getZone)
router.get('/getBanner',verifyToken, getBanner)
router.get('/getAllBanner', getAllBanner)
router.get('/users',verifyToken, users)
router.get('/getCity', getCity)
router.get('/getAviableCity', getAviableCity)
router.get("/categories", getCategories);
router.get("/getBrand", getBrand);
router.get('/getAttributes', getAttributes)
router.get('/getAttributesId/:id', getAttributesId)
router.get('/getProducts',verifyToken, getProduct)
router.get('/adminProducts', adminProducts)
router.get('/getFeatureProduct',verifyToken, getFeatureProduct)
router.get('/bestSelling',verifyToken, bestSelling)
router.get('/search', searchProduct)
router.get('/getUnit', getUnit)
router.get('/getCart',verifyToken, getCart)
router.get('/getDiscount', getDicount)
router.get('/getVarients/:id', getVarients)
router.get('/orders', getOrders);
router.get('/settings',verifyToken,settings);
router.get('/getAddress',verifyToken,getAddress);
router.get('/getStore',getStore);
router.get('/relatedProduct/:productId',getRelatedProducts)
router.get('/getFilter',getFilter);
router.get('/getDeliveryEstimate',verifyToken,getDeliveryEstimate);
router.get('/send-test-notification',test)
router.get('/getdeliveryStatus',getdeliveryStatus)

router.put('/editBrand/:id', upload, editBrand)
router.put('/updatedeliveryStatus/:id',upload, updatedeliveryStatus)
router.put('/EditAddress/:id', EditAddress)
router.put('/addFilterInCategory/:id', addFiltersToCategory)
router.post('/addUser', upload, addUser)
router.patch('/edit/:id', upload, update)
router.patch('/updateAt/:id', updateAt);
router.put('/setDefault',verifyToken, setDefault);
router.put('/updateCityStatus/:id', updateCityStatus);
router.patch('/admin/banner/:id/status',upload, updateBannerStatus);
router.put('/updateZoneStatus/:id', updateZoneStatus);
router.patch('/editAttributes/:id', editAttributes);
router.put('/editCat/:id',upload, editCat);
router.put('/addCategoryInStore/:id',addCategoryInStore)
router.put('/updateCart/:id',quantity)
router.put('/orderStatus/:id', orderStatus);
router.patch('/update-profile',upload, verifyToken, updateProfile);
router.patch('/updateProduct/:id',upload, updateProduct);
router.delete('/deleteAddress/:id',deleteAddress)
router.delete('/deleteProduct/:id',deleteProduct)
router.delete('/removeCart/:id',deleteCart)
router.patch('/editFilter/:id', editFilter);
router.delete('/deleteFilter/:id',deleteFilter);
router.delete('/deleteFilterVal/:id',deleteFilterVal)
router.delete('/removeCategoryInStore/:id',removeCategoryInStore)
router.delete('/deleteAttribute/:id',deleteAttribute)

router.get('/zones', (req, res) => {
  res.json(cityZone);
});
module.exports = router;