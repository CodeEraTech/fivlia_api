const mongoose = require('mongoose');

const tipSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.ObjectId, ref: 'drivers' },
  orderId: { type: String },
  note:{type:String},
  tip:{type:Number},
  userId: { type: mongoose.Schema.ObjectId, ref: 'Login' },
}, { timestamps: true });

module.exports = mongoose.model('driverTip', tipSchema);
