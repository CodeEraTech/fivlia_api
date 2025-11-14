const mongoose = require('mongoose');

const appPageSchema = new mongoose.Schema({
   appName:String,
   stream:String,
   description:String,
   appLink:String,
   appImage:String
},{timestamps:true})
module.exports=mongoose.model('appPages',appPageSchema)