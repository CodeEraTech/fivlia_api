const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
 title:String,
 description:String,
 image:String,
 city:String,
},{timestamps:true});

module.exports = mongoose.model('notification', notificationSchema);