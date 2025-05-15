const mongoose = require('mongoose');
const cityZone = require('./cityZone');
const categorySchemma=new mongoose.Schema({
    name:String,
    description:String,
    subcat:[String],
    file:String,
},{timestamps:true})
module.exports=mongoose.model('Category',categorySchemma,'Categories')