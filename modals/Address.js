const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId:{type:mongoose.Schema.ObjectId,ref:'Login'},
  fullName: { type: String},
  mobileNumber: { type: String},
  pincode: { type: String},
  house_No:{type: String},
  locality: { type: String},
  address: { type: String},
  state:{type: String},
latitude:{type:Number},
longitude:{type:Number},
  city: {type:String},
  addressType: { type: String, enum: ['home', 'work', 'other', 'default'] },
},{timestamps:true});

module.exports=mongoose.model('Address',addressSchema)