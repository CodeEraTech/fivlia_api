const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  longitude: Number,
  latitude: Number,
});

module.exports = mongoose.model('Location', locationSchema,'Login');
