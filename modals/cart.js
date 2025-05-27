const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
   image:String,
   price:String,
   name:String,
   quantity:Number
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