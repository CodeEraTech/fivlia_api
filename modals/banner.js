const mongoose = require('mongoose');
const bannerSchemma=new mongoose.Schema({
    title:String,
    description:String,
    location:[String],
    image:String
},{timestamps:true})
module.exports=mongoose.model('Banner',bannerSchemma)