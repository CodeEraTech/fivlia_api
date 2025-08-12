const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
   wallet:Number,
   currentAmount:Number,
   lastAmount:Number,
   type:String,
   amount: { type: Number},
   orderId:String,
   driverId:{type:mongoose.Schema.ObjectId,ref:'drivers'},
   description:String,
},{timestamps:true})
module.exports=mongoose.model('admin_transaction',adminSchema)