const mongoose = require('mongoose');

const sellerProductSchema = new mongoose.Schema({
   image:String,
   sellerId:{type:mongoose.Schema.Types.ObjectId,ref:'sellers'},
   name:String,
   price:Number,
   stock:Number,
   rating:{type:Number,default:0},
   approvalStatus:{type:String,default:'Pending'},
   category:{id:{type:mongoose.Schema.Types.ObjectId,ref:'Categories'}},
   status:{type:Boolean,default:false}
},{timestamps:true})
module.exports=mongoose.model('sellerProduct',sellerProductSchema)