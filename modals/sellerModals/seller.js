// modals/otp.js
const mongoose = require('mongoose');
const sellerSchema = new mongoose.Schema({
  storeName: String,
  firstName:String,
  lastName:String,
  gstNumber:String,
  productCategory:[String],
  additionalInformation:String,
  lat:Number,
  lng:Number,
  mobileNumber:{mobileNo:String,verified:{ type: String, default: 'unverified' }},
  email:{Email:String,verified:{ type: String, default: 'unverified' }},
  address:String,
  businessDetails:String,
  bankDetails:String,
  storeImages:[String],
  city:String,
  zone:[{name:String,range:Number,lat:Number,lng:Number}],
  storeLicense:String,
  gst:String,
  panCard:String,
  addressProof:String,
  status: {type: String,enum: ['pending_verification', 'pending_admin_approval', 'approved', 'rejected'],default: 'pending_verification'}

});

module.exports = mongoose.model('seller', sellerSchema);