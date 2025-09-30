const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId:{type:String,default:'OID001'},
 addressId:{type:mongoose.Schema.ObjectId,ref:'Address'},
 paymentStatus:String,
 userId:{type:mongoose.Schema.ObjectId,ref:'Login'},
 cashOnDelivery:{type:Boolean},
items: [
  {productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  varientId: { type: mongoose.Schema.Types.ObjectId },
  name: String,quantity: Number,price: Number,commision:Number,image: String,gst:String  }],
 totalPrice: Number,
 deliveryCharges:Number,
 storeId:{type:mongoose.Schema.ObjectId,ref:'Store'},
 orderStatus:{type:String,default:'Pending'},
 platformFee:Number,
 invoiceUrl: { type: String },
 storeInvoiceId:{type: String},
 feeInvoiceId:{type: String},
 thermalInvoice: { type: String },
 transactionId:String,
 driver:{driverId:String,name:String,mobileNumber:String}
},{timestamps:true});

// models/TempOrder.js

const TempOrderSchema = new mongoose.Schema({
  items: [
  {productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  varientId: { type: mongoose.Schema.Types.ObjectId },
  name: String,quantity: Number,price: Number,image: String,gst:String  }],
  orderId:{type:String,default:'OID001'},
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
  paymentStatus:String,
  cashOnDelivery:Boolean,
  storeId:{type:mongoose.Schema.ObjectId,ref:'Store'},
  totalPrice: Number,
  deliveryCharges:Number,
  platformFee:Number,
  cartIds:[{type:mongoose.Schema.Types.ObjectId,ref:'carts'}]
}, { timestamps: true });

module.exports = {
 Order: mongoose.model('Order', orderSchema),
 TempOrder: mongoose.model('TempOrder', TempOrderSchema)
}
