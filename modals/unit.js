const mongoose = require('mongoose');

const unitScheema = new mongoose.Schema({
    unitname:{type:String},
    })

module.exports=mongoose.model('Unit',unitScheema)

