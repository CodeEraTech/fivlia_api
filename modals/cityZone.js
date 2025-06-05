const mongoose = require('mongoose');
const { boolean } = require('zod/v4');

const citySchemma=new mongoose.Schema({
     city: {
    type: String,
    required: true,
    unique: true,
  },
  state:String,
  
fullAddress:String,
latitude:Number,
longitude:Number,

  status:{type:boolean,default:true},
  zones: {
    type: [String],
    default: [],
  },
},{timestamps:true})

const mainSchema = new mongoose.Schema({
  zoneTitle:String,
  cashOnDelivery: { type: Boolean, default: true },
  status: { type: Boolean, default: true },
  address: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  range: { type: Number },

}, { _id: true });

const zoneSchemma=new mongoose.Schema({
    city:{type:String},
    zones: [mainSchema]
},{timestamps:true})

module.exports = {
  CityData: mongoose.model('AvalibleCity', citySchemma,"AvalibleCity"),
  ZoneData: mongoose.model('Locations', zoneSchemma,'Locations')
};