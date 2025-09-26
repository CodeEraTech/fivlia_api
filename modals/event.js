const mongoose = require('mongoose');

const eventScheema = new mongoose.Schema({
    eventDetails:{
    fontColor:{type:String},
    eventImage:{type:String},
    eventTitle:{type:String},
    },
    type:{type:String},
    eventStatus:{type:Boolean},
    startTime:{type:String},
    endTime:{type:String}
    })

module.exports=mongoose.model('event',eventScheema)

