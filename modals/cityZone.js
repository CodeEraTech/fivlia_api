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

const mainSchema = new mongoose.Schema({
  cashOnDelivery: { type: Boolean, default: true },
  status: { type: Boolean, default: true },
}, { _id: true });

const zoneSchemma=new mongoose.Schema({
    zones: [mainSchema]
},{timestamps:true})

module.exports = {
  CityData: mongoose.model('AvalibleCity', citySchemma,"AvalibleCity"),
  ZoneData: mongoose.model('Locations', zoneSchemma,'Locations')
};