const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
   driverId:String,
   driverName:String,
   image:String,
   status:{type:Boolean, default:true},
   email:String,
   password:String,
   wallet:Number,
   vehicleType:String,
   vehicleRegistrationNumber:String,
   drivingLicenseNumber:String,
   driverDeviceId:String,
   approveStatus: { type: String, enum: ['pending_admin_approval', 'approved', 'rejected'] },
   address:{
    city:String,
    mobileNo:String,
    locality:String,
    },
  aadharCard: {
    front:String,
    back: String
  },
  drivingLicence: {
    front: String,
    back: String
  },
  // ... existing code ...
activeStatus: {
  type: String,
  enum: ['online', 'offline'],
  default: 'online'
},
    Police_Verification_Copy:String,
    fcmToken:String
},{timestamps:true})
module.exports=mongoose.model('driver',driverSchema)
