const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  pincode: { type: String, required: true },
  locality: { type: String, required: true },
  address: { type: String, required: true },
  zone:{ type: mongoose.Schema.Types.ObjectId, ref: 'Locations'},
  city: { type: String, required: true },
  addressType: { type: String, enum: ['home', 'work', 'other'], required: true },
},{timestamps:true});

const userSchema = new mongoose.Schema({
    name:String,
    password:{type:String,required:true},
    mobileNumber:{type:String,required:false,unique:true},
    email:{type:String,required:true,unique:false},
    location:{latitude:{type:Number},longitude:{type:Number}},
    state: { type: String, required: false },
    city: { type: String, required: false },
    image:String,  
    Address: [addressSchema],
    otp:{type:String,require:false},
},{timestamps:true})
module.exports=mongoose.model('User',userSchema,'Login')
