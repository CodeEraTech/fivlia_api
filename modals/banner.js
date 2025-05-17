const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    bannerId:{type:String,unique:true,required:true},
    image:String,
    title:{type:String,required:true},
    type:{type:String,enum:['offer','normal'],default:'normal'}
},{timestamps:true})
module.exports=mongoose.model('Banner',bannerSchema)