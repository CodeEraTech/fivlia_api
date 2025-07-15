const { getStoresWithinRadius } = require('../config/google');
const driver = require('../modals/driver')
const {Order} = require('../modals/order')
require('dotenv').config()
const jwt = require('jsonwebtoken');

exports.driverLogin = async(req,res) => {
    try {
const {mobileNumber, password} = req.body

  const last10 = mobileNumber.replace(/\D/g, "").slice(-10);

const exist = await driver.findOne({
      "address.mobileNo": { $regex: `${last10}$` } // ends with last10
    });

if(!exist){
    return res.status(400).json({message:"User Not Found"})
}
if(exist.password !== password){
    return res.status(400).json({message:"Invalid Credentials"})
}
const token = jwt.sign({ _id: exist._id }, process.env.jwtSecretKey);
return res.status(200).json({message:"Login Successful",   DriverDetails: {
        id: exist._id,
        name: exist.driverName,
        mobile: exist.address.mobileNo,
        email: exist.email,
      },
      token
    })
} catch (error) {
      console.error(error);
      return res.status(500).json({message:"An error occured"})      
    }
}

exports.getDriverOrder = async (req,res) => {
  try {
    const lat = 29.155409
    const lng = 75.7219163

    const store =await getStoresWithinRadius(lat,lng)
    const allowedStores = Array.isArray(store?.matchedStores) ? store.matchedStores : [];
    console.log('stores',store)
    const allowedStoreIds = allowedStores.map(store => store._id);
    const orders = await Order.find({storeId:{$in:allowedStoreIds}})
    return res.status(200).json({message:'Orders',orders})
  } catch (error) {
    console.error(error);
    return res.status(500).json({message:"An error occured"})   
  }
}