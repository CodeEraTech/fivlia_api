const express = require('express');
const upload = require('../midllerware/multer');
const router = express.Router()
const verifyToken = require('../midllerware/authToken');
//abc
const { forwebbestselling, forwebgetProduct, forwebgetFeatureProduct, forwebsearchProduct, forwebgetRelatedProducts, forwebgetBanner, getDeliveryEstimateForWebsite, addPage, editPage, getPage, deletePage, updatePageStatus } = require('../controlers/websiteapicontroler')

const { driverLogin, acceptOrder, driverOrderStatus, acceptedOrder, activeStatus, driverWallet, transactionList, cancelOrders, getDriverDetail, completedOrders, editProfile, deleteDriver,withdrawalRequest } = require('../controlers/driverControler')

const { getDashboardStats, getStoreDashboardStats, walletAdmin,adminTranaction,getWithdrawalRequest } = require('../controlers/dashboardControler')
const { getDeliveryEstimate } = require('../controlers/DeliveryControler')

const { createStore, storeLogin, verifyEmail, getStore, addCategoryInStore, removeCategoryInStore, storeEdit } = require('../controlers/storeControler');

const { settings, getSettings, adminSetting, getSmsType } = require('../controlers/settingControler');
const { users, addUser, updateProfile, Login, signin, deleteAccount, register, verifyMobile, verifyOtp } = require('../controlers/authControler');

const { intro, getIntro } = require('../controlers/controlers')

const { placeOrder, getOrders, orderStatus, test, driver, getDriver, editDriver, verifyPayment, getOrderDetails, deliveryStatus, updatedeliveryStatus, getdeliveryStatus, notification,editNotification,deleteNotification, getNotification } = require('../controlers/orderControler')

const { addCart, getCart, getDicount, discount, quantity, deleteCart } = require('../controlers/cartControler')

const { update, banner, getBanner, getAllBanner, updateBannerStatus, addCategory, getCategories, brand, getBrand, editCat, updateAt, editBrand, addFilter, editFilter, getFilter, deleteFilter, deleteFilterVal, addFiltersToCategory, addMainCategory, getMainCategory, editMainCategory, GetSubSubCategories, GetSubCategories } = require('../controlers/categorycontroler');

const { addProduct, addAtribute, getAttributes, getProduct, getFeatureProduct, searchProduct, bestSelling, editAttributes, unit, getUnit, getVarients, filter, bulkProductUpload, updateProduct, deleteProduct, getAttributesId, getRelatedProducts, updateStock, adminProducts, deleteAttribute, rating } = require('../controlers/ProductControler')

const cityZone = require('../modals/cityZone');
const { addCity, updateCityStatus, getAviableCity, getCity, updateZoneStatus, getAllZone, getZone, updateLocation, addAddress, getAddress, EditAddress, deleteAddress, setDefault } = require('../controlers/areaControler');

router.post('/Login', Login)
router.post('/verifyOtp', verifyOtp)
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
router.post('/addCart', upload, verifyToken, addCart)
router.post('/placeOrder', placeOrder);
router.post('/verifyPayment', verifyPayment);
router.post('/filter', filter)
router.post('/createStore', upload, createStore)
router.post('/Product/bulk', upload, bulkProductUpload),
 router.put('/adminSetting', adminSetting)
router.post('/addFilter', addFilter)
router.post('/address', verifyToken, addAddress);
router.post('/updateStock/:productId', updateStock);
router.post('/driver', upload, driver);
router.post('/deliveryStatus', upload, deliveryStatus);
router.post('/rating', verifyToken, rating);
router.post('/withdrawalRequest', withdrawalRequest);

router.post('/addMainCategory', upload, addMainCategory)

router.post('/storeLogin', storeLogin)
router.post('/discount', discount)
router.post('/addCity', addCity)
router.post('/location', verifyToken, updateLocation)
router.post('/notification',upload,notification)
router.post('/driverLogin', driverLogin)
router.post('/activeStatus', activeStatus)
router.post('/addPage', addPage)


router.get('/getSmsType', getSmsType)
router.get('/getDashboardStats', getDashboardStats)
router.get('/getWithdrawalRequest', getWithdrawalRequest)
router.get('/acceptedOrder/:mobileNumber', acceptedOrder)
router.get('/getStoreDashboardStats/:storeId', getStoreDashboardStats)
router.get('/verify-email', verifyEmail)
router.get('/getNotification', getNotification)
router.get('/getOrderDetails', verifyToken, getOrderDetails)
router.get('/getDriver', getDriver)
router.get('/getIntro', getIntro)
router.get('/getAllZone', getAllZone)
router.get('/getZone', getZone)
router.get('/getBanner', verifyToken, getBanner)
router.get('/getAllBanner', getAllBanner)
router.get('/users', users)
router.get('/getCity', getCity)
router.get('/getAviableCity', getAviableCity)
router.get("/categories", getCategories);
router.get("/getBrand", getBrand);
router.get('/getAttributes', getAttributes)
router.get('/getAttributesId/:id', getAttributesId)
router.get('/getProducts', verifyToken, getProduct)
router.get('/adminProducts', adminProducts)
router.get('/walletAdmin', walletAdmin)
router.get('/adminTranaction', adminTranaction)
router.get('/getFeatureProduct', verifyToken, getFeatureProduct)

router.get('/website/bestSelling', forwebbestselling)
router.get('/website/getProduct', forwebgetProduct)
router.get('/website/featureProduct', forwebgetFeatureProduct)
router.get('/website/searchProduct', forwebsearchProduct)
router.get('/website/relatedProducts', forwebgetRelatedProducts)
router.get('/website/forwebgetBanner', forwebgetBanner)
router.get('/getPage', getPage)

router.get('/completedOrders/:mobileNumber', completedOrders)
router.get('/getDriverDetail/:id', getDriverDetail)
router.get('/cancelOrders/:driverId', cancelOrders)
router.get('/transactionList/:driverId', transactionList)
router.get('/bestSelling', verifyToken, bestSelling)
router.get('/search', verifyToken, searchProduct)
router.get('/getUnit', getUnit)
router.get('/getCart', verifyToken, getCart)
router.get('/getDiscount', getDicount)
router.get('/getVarients/:id', getVarients)
router.get('/orders', getOrders);
router.get('/getSettings', getSettings)
router.get('/settings', verifyToken, settings);
router.get('/getAddress', verifyToken, getAddress);
router.get('/getStore', getStore);
router.get('/relatedProduct/:productId', verifyToken, getRelatedProducts)
router.get('/getFilter', getFilter);
router.get('/getMainCategory', getMainCategory);
router.get('/getDeliveryEstimate', verifyToken, getDeliveryEstimate);
router.get('/getDeliveryEstimateForWebsite', getDeliveryEstimateForWebsite);
router.get('/send-test-notification', test)
router.get('/getdeliveryStatus', getdeliveryStatus)
router.get('/GetSubSubCategories/:subcatId', GetSubSubCategories)
router.get('/GetSubCategories/:categoryId', GetSubCategories)

router.put('/editProfile/:id', upload, editProfile)
router.put('/driverWallet/:orderId', driverWallet)
router.put('/driverOrderStatus', driverOrderStatus)
router.put('/editBrand/:id', upload, editBrand)
router.put('/editMainCategory', upload, editMainCategory)
router.put('/editDriver/:driverId', upload, editDriver)
router.put('/storeEdit/:storeId', upload, storeEdit)
router.put('/updatedeliveryStatus/:id', upload, updatedeliveryStatus)
router.put('/EditAddress/:id', EditAddress)
router.put('/addFilterInCategory/:id', addFiltersToCategory)
router.post('/addUser', upload, addUser)
router.patch('/edit/:id', upload, update)
router.patch('/updateAt/:id', updateAt);
router.put('/setDefault', verifyToken, setDefault);
router.put('/updateCityStatus/:id', updateCityStatus);
router.patch('/admin/banner/:id/status', upload, updateBannerStatus);
router.put('/updateZoneStatus/:id', updateZoneStatus);
router.patch('/editAttributes/:id', editAttributes);
router.put('/editCat/:id', upload, editCat);
router.put('/addCategoryInStore/:id', addCategoryInStore)
router.put('/updateCart/:id', quantity)
router.put('/orderStatus/:id', orderStatus);
router.patch('/update-profile', upload, verifyToken, updateProfile);
router.patch('/updateProduct/:id', upload, updateProduct);
router.delete('/deleteAddress/:id', deleteAddress)
router.delete('/deleteProduct/:id', deleteProduct)
router.delete('/removeCart/:id', deleteCart)
router.patch('/editFilter/:id', editFilter);
router.delete('/deleteFilter/:id', deleteFilter);
router.delete('/deleteFilterVal/:id', deleteFilterVal)
router.delete('/removeCategoryInStore/:id', removeCategoryInStore)
router.delete('/deleteAttribute/:id', deleteAttribute)
router.delete('/deleteAccount', verifyToken, deleteAccount)
router.delete('/deleteDriver/:id', deleteDriver)
router.put('/acceptOrder', acceptOrder)
router.delete('/deletePage/:id', deletePage)
router.put('/editPage/:id', editPage)
router.put('/updatePageStatus/:id',updatePageStatus)
router.put('/editNotification/:id',upload,editNotification)
router.delete('/deleteNotification/:id', deleteNotification)

router.get('/zones', (req, res) => {
  res.json(cityZone);
});
module.exports = router;