const mongoose = require('mongoose');

const attributeScheema = new mongoose.Schema({
        name:String
    })

module.exports=mongoose.model('Attribute',attributeScheema)