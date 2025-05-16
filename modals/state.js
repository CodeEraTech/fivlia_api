const mongoose = require('mongoose');

const stateSchemma=new mongoose.Schema({
    
     state: {
    type: String,
    required: true,
    unique: true,
  },
  city: {
    type: [String],
    default: [],
  },
},{timestamps:true})
module.exports=mongoose.model('StateData',stateSchemma)