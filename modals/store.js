const mongoose = require('mongoose');

const storeScheema = new mongoose.Schema({
    storeName:String,
    city:{_id:{type:mongoose.Schema.ObjectId,ref:'Locations'},name:String},
    ownerName:String,
    PhoneNumber:String,
    email:String,
    password:String,
    zone:[{_id:{type:mongoose.Schema.ObjectId,ref:'Locations'},name:String,title:String,latitude:Number,longitude:Number,range:Number}],
    Latitude:String,
    Longitude:String,
    status:{type:Boolean,default:true},
    Description:String,
    Authorized_Store:{type:Boolean,default:true},
    Category:[{type:mongoose.Schema.ObjectId,ref:'Category'}],
    image:String,
    emailVerified: { type: Boolean, default: false },
    verificationToken: String,
    },{timestamps:true})

module.exports=mongoose.model('Store',storeScheema)

