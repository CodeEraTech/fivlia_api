const mongoose = require('mongoose');

const storeScheema = new mongoose.Schema({
    storeName:String,
    city:String,
    zone:String,
    Latitude:String,
    Longitude:String,
    Description:String,
    Authorized_Store:{type:Boolean,default:true},
    Category:[{type:mongoose.Schema.ObjectId,ref:'Category'}],
    image:String
    },{timestamps:true})

module.exports=mongoose.model('Store',storeScheema)

