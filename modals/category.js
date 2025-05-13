const mongoose = require('mongoose');
const cityZone = require('./cityZone');
const categorySchemma=new mongoose.Schema({
    name:String,
    price:String,
    discount:String,
    category:String,
    size:{enum:["S","L","M"],default:"M",type:String,required:true},
    image:String,
    city:{ type: String,enum: Object.keys(cityZone),required: true},
    zone:String,
},{timestamps:true})
module.exports=mongoose.model('Products',categorySchemma)