const mongoose = require('mongoose');

const chairtySchema = new mongoose.Schema({
    title:String,
    category:String,
    shortDescription:String,
    content:String,
    image:String,
    slug:String
},{timestamps:true})
module.exports=mongoose.model('chairty',chairtySchema)

