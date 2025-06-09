const mongoose = require('mongoose');

const storeScheema = new mongoose.Schema({
    storeName:String,
    city:{_id:{type:mongoose.Schema.ObjectId,ref:'Locations'},name:String},
    ownerName:String,
    PhoneNumber:String,
    zone:[{_id:{type:mongoose.Schema.ObjectId,ref:'Locations'},name:String,title:String}],
    Latitude:String,
    Longitude:String,
    Description:String,
    Authorized_Store:{type:Boolean,default:true},
    Category:[{type:mongoose.Schema.ObjectId,ref:'Category'}],
    image:String
    },{timestamps:true})

module.exports=mongoose.model('Store',storeScheema)

