const mongoose = require('mongoose');
const category = require('./category');

const bannerSchema = new mongoose.Schema({
    bannerId:{type:String,unique:true,required:true},
    image:String,
    title:{type:String,required:true},
    zone:String,
    mainCategory: { type: String },
    subCategory: { type: String },
    subSubCategory: { type: String },
    type:{type:String,enum:['offer','normal'],default:'normal'}
},{timestamps:true})
module.exports=mongoose.model('Banner',bannerSchema)