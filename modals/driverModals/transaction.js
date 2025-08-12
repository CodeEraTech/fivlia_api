const mongoose = require('mongoose');;

const transactionSchema = new mongoose.Schema({
  driverId:{type:mongoose.Schema.ObjectId,ref:'drivers'},
  amount: { type: Number},
  orderId:{type:mongoose.Schema.ObjectId,ref:'orders'},
  type:String,
  description:String
},{timestamps:true});

module.exports=mongoose.model('Driver_Transaction',transactionSchema)