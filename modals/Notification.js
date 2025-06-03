const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
 title:String,
 description:String,
 image:String,
 time: { type: Date },
 zone:[String]

});

module.exports = mongoose.model('notification', notificationSchema);
