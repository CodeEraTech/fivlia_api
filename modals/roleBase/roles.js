const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    roles:{type:String,unique:true},
    permissions:[{type:String}]
    },{timestamps:true})

module.exports=mongoose.model('role',roleSchema)

