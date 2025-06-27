const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
   driverId:String,
   driverName:String,
   image:String,
   status:Boolean,
   address:{city:String,
    mobileNo:String,
    locality:String
}
},{timestamps:true})
module.exports=mongoose.model('driver',driverSchema)