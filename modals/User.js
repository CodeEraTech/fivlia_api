const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  fullName: { type: String},
  mobileNumber: { type: String},
  pincode: { type: String},
  locality: { type: String},
  address: { type: String},
  zone:{ type: mongoose.Schema.Types.ObjectId, ref: 'Locations'},
  city: { type: String},
  addressType: { type: String, enum: ['home', 'work', 'other'] },
},{timestamps:true});

const userSchema = new mongoose.Schema({
    name:String,
    password:{type:String},
    mobileNumber:{type:String},
    email:{type:String},
    location:{latitude:{type:Number},longitude:{type:Number}},
    state: { type: String},
    city: { type: String},
    image:String,  
    Address: [addressSchema],
    userId:String,
    fcmToken:String,
    otp:{type:String},
},{timestamps:true})
module.exports=mongoose.model('User',userSchema,'Login')
