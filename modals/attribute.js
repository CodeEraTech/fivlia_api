const mongoose = require('mongoose');

const attributeScheema = new mongoose.Schema({
        weight:String,
        size:String,
        color:String
    })

module.exports=mongoose.model('Attribute',attributeScheema)