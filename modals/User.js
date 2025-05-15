const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name:String,
    password:{type:String,required:true},
    mobileNumber:{type:String,required:false,unique:true},
    email:{type:String,required:true,unique:false},
    otp:{type:String,require:false},
},{timestamps:true})
module.exports=mongoose.model('User',userSchema)