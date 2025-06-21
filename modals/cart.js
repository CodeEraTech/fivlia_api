const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
   image:String,
   price: { type: Number},
   name:String,
   quantity:Number,
   productId:{type:mongoose.Schema.ObjectId,ref:'products'},
   varientId:{type:mongoose.Schema.ObjectId},
   userId:{type:mongoose.Schema.ObjectId,ref:'Login'},
   paymentOption:{type:Boolean}
},{timestamps:true})

const discountSchema=new mongoose.Schema({
  head:String,
  value:Number,
  description:String
})

module.exports={
    Cart:mongoose.model('Cart',cartSchema),
    Discount:mongoose.model('Discount',discountSchema)
}