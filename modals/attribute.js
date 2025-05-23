const mongoose = require('mongoose');

const attributeScheema = new mongoose.Schema({
    Attribute_name:{type:String,unique:true},
    varient:[{
       name: { type: String}
    }]

    })

module.exports=mongoose.model('Attribute',attributeScheema)

