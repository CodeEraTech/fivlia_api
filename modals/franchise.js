const mongoose = require('mongoose');

const franchiseSchema = new mongoose.Schema({
fullName:String,
phone:String,
email:String,
state:String,
city:String,
message:String,
franchiseInvestment:Boolean,
investWithUs:Boolean,
},{timestamps:true});

module.exports = mongoose.model('franchise', franchiseSchema);