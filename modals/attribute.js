const mongoose = require('mongoose');

const attributeScheema = new mongoose.Schema({
    Attribute_name:{type:String,unique:true},
    attributeId:String,
    varient:[{
       name: { type: String},
       variantId:String
    }]

    })

module.exports=mongoose.model('Attribute',attributeScheema)

