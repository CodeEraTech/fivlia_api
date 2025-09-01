const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
   currentAmount:Number,
   lastAmount:Number,
   type:String,
   amount: { type: Number},
   orderId:String,
   storeId:{type:mongoose.Schema.ObjectId,ref:'stores'},
   description:String,
},{timestamps:true})
module.exports=mongoose.model('store_transaction',storeSchema)