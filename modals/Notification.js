const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
 title:String,
 description:String,
 image:String,
 time: { type: Date },
 city:[{type:mongoose.Schema.Types.ObjectId,ref:'Locations'}],
readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Login' }],
 sent: { type: Boolean, default: false },
 global: { type: Boolean, default: false }
});

module.exports = mongoose.model('notification', notificationSchema);