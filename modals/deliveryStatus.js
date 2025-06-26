const mongoose = require('mongoose');

const deliveryStatusSchema = new mongoose.Schema({
   statusCode:{type:String,default:'100'},
   statusTitle:String,
   status:Boolean,
},{timestamps:true})
module.exports=mongoose.model('deliveryStatus',deliveryStatusSchema)