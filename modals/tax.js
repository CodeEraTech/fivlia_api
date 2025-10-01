const mongoose = require('mongoose');
const taxSchema = new mongoose.Schema({
    value:String
})
module.exports=mongoose.model('Tax',taxSchema,'Tax')
