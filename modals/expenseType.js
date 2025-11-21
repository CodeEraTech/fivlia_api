const mongoose = require('mongoose');

const expenseTypeScheema = new mongoose.Schema({
    title:String,
    },{timestamps:true})

module.exports=mongoose.model('expenseType',expenseTypeScheema)

