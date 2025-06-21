const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
 addressId:{type:mongoose.Schema.ObjectId},
 paymentStatus:String,
 userId:{type:mongoose.Schema.ObjectId},
 cashOnDelivery:Boolean,
items: [
  {productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Products' },
  varientId: { type: mongoose.Schema.Types.ObjectId },
  name: String,quantity: Number,price: Number,image: String,  }],
 totalPrice: Number,
 gst:String,
 deliveryCharges:Number,
 platformFee:Number
});

// models/TempOrder.js

const TempOrderSchema = new mongoose.Schema({items: [
  {productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Products' },
  varientId: { type: mongoose.Schema.Types.ObjectId },
  name: String,quantity: Number,price: Number,image: String,  }],
  
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
  paymentStatus:String,
  gst:String,
  cashOnDelivery:Boolean,
  storeId:{type:mongoose.Schema.Types.ObjectId,ref:'stores'},
  totalPrice: Number,
  deliveryCharges:Number,
  platformFee:Number,
}, { timestamps: true });

module.exports = {
 Order: mongoose.model('Order', orderSchema),
 TempOrder: mongoose.model('TempOrder', TempOrderSchema)
}
