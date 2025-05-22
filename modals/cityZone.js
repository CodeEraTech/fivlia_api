const mongoose = require('mongoose');
const { boolean } = require('zod/v4');

const citySchemma=new mongoose.Schema({
     city: {
    type: String,
    required: true,
    unique: true,
  },
  status:{type:boolean,default:true},
  zones: {
    type: [String],
    default: [],
  },
},{timestamps:true})

const zoneSchemma=new mongoose.Schema({
     city: {
    type: [String],
    required: true,
    unique: true,
  },
},{timestamps:true})

module.exports = {
  CityData: mongoose.model('AvalibleCity', citySchemma,"AvalibleCity"),
  ZoneData: mongoose.model('Locations', zoneSchemma,'Locations')
};