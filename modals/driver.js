const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
   driverId:String,
   driverName:String,
   image:String,
   status:Boolean,
   email:String,
   password:String,
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
    Police_Verification_Copy:String,
},{timestamps:true})
module.exports=mongoose.model('driver',driverSchema)
