const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
 addressId:{type:mongoose.Schema.ObjectId,ref:'Address'},
 paymentStatus:String,
 userId:{type:mongoose.Schema.ObjectId,ref:'Login'},
 cashOnDelivery:{type:Boolean},
items: [
  {productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Products' },
  varientId: { type: mongoose.Schema.Types.ObjectId },
  name: String,quantity: Number,price: Number,image: String,gst:String  }],
 totalPrice: Number,
 deliveryCharges:Number,
 storeId:{type:mongoose.Schema.Types.ObjectId,ref:'Store'},
 orderStatus:{type:String,default:'Pending'},
 platformFee:Number,
 transactionId:String
},{timestamps:true});

// models/TempOrder.js

const TempOrderSchema = new mongoose.Schema({
  items: [
  {productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Products' },
  varientId: { type: mongoose.Schema.Types.ObjectId },
  name: String,quantity: Number,price: Number,image: String,gst:String  }],

  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
  paymentStatus:String,
  cashOnDelivery:Boolean,
  storeId:{type:mongoose.Schema.Types.ObjectId,ref:'Store'},
  totalPrice: Number,
  deliveryCharges:Number,
  platformFee:Number,
}, { timestamps: true });

module.exports = {
 Order: mongoose.model('Order', orderSchema),
 TempOrder: mongoose.model('TempOrder', TempOrderSchema)
}
