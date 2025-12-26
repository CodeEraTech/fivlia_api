const mongoose = require('mongoose');
const couponSchema = new mongoose.Schema({
    storeId:{type:mongoose.Schema.ObjectId,ref:'stores'},
    offer:String,
    title:String,
    limit:Number,
    status:{type:Boolean, default:true},
    expireDate:Date,
},{timestamps:true})
module.exports=mongoose.model('coupon',couponSchema)
