const mongoose = require('mongoose');

const attributeScheema = new mongoose.Schema({
        name:[{type:String,unique:true}]
    })

module.exports=mongoose.model('Attribute',attributeScheema)