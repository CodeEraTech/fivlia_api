const mongoose = require('mongoose');

const filterScheema = new mongoose.Schema({
    Filter_name:{type:String},
    Filter:[{
       name: { type: String}
    }]

    })

module.exports=mongoose.model('Filter',filterScheema)

