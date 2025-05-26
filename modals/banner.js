const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    image:String,
    title:{type:String,required:true},
    city:String,
  zones: [
    {
      address: { type: String, required: true },
      latitude: { type: String, required: true },
      longitude: { type: String, required: true }
    }
  ],
    mainCategory: { type: String },
    subCategory: { type: String },
    subSubCategory: { type: String },
    status:{type:Boolean,dafault:true},
    type:{type:String,enum:['offer','normal'],default:'normal'}
},{timestamps:true})
module.exports=mongoose.model('Banner',bannerSchema)




//   zones: [{type: {type: String,enum: ['Point'],required: true},coordinates: {type: [Number],required: true},    address: {type: String,required: true}}],