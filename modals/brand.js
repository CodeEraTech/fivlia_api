const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
   brandName:String,
   brandLogo:String,
   description:String,
   featured:Boolean
},{timestamps:true})
module.exports=mongoose.model('brand',brandSchema)