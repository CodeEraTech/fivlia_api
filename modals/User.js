const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name:String,
    password:{type:String},
    mobileNumber:{type:String},
    email:{type:String},
    location:{
        latitude:{type:Number},
        longitude:{type:Number},
        city: String,        
        zone: String   
    },
    state: { type: String},
    city: { type: String},
    image:String,  
    userId:String,
    fcmToken:String,
    otp:{type:String},
},{timestamps:true})
module.exports=mongoose.model('User',userSchema,'Login')
