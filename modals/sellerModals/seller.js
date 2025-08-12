// modals/otp.js
const mongoose = require('mongoose');
const sellerSchema = new mongoose.Schema({
  storeName: String,
  ownerName:String,
  mobileNumber:String,
  password:String,
  email:String,
  address:String,
  businessDetails:String,
  bankDetails:String,
  storeImages:String,
  city:String,
  zone:String,
  storeLicense:String,
  gst:String,
  panCard:String,
  addressProof:String,
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('seller', sellerSchema);