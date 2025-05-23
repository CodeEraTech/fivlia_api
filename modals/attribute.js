const mongoose = require('mongoose');

const attributeScheema = new mongoose.Schema({
    Attribute_name:{type:String},
    varient:[{
       name: { type: String}
    }]

    })

module.exports=mongoose.model('Attribute',attributeScheema)

