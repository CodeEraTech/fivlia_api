const mongoose = require('mongoose');

const contactUsSchema = new mongoose.Schema({
    firstName:String,
    lastName:String,
    email:String,
    phone:String,
    message:String
},{timestamps:true})
module.exports=mongoose.model('contactUs',contactUsSchema)