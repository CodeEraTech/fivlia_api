const mongoose = require('mongoose');
const introSchemma=new mongoose.Schema({
    title:String,
    description:String,
    image:String
},{timestamps:true})
module.exports=mongoose.model('Intro',introSchemma)