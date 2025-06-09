const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
 title:String,
 description:String,
 image:String,
 time: { type: Date },
 zone:[{type:mongoose.Schema.Types.ObjectId,ref:'Locations'}],
 read:{ type: Boolean, default: false },
 sent: { type: Boolean, default: false }
});

module.exports = mongoose.model('notification', notificationSchema);