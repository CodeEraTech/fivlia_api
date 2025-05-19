const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
   brandName:String,
   brandLogo:String,
   Description:String,
},{timestamps:true})
module.exports=mongoose.model('brand',brandSchema)