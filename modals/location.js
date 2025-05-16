const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  longitude: Number,
  latitude: String,
});

module.exports = mongoose.model('Location', locationSchema);
