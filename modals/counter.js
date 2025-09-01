const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String },   // name of the sequence, e.g., "orderId"
  seq: { type: Number }
});

module.exports = mongoose.model('Counter', counterSchema);
