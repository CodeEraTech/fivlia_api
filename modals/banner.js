const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    bannerId:{type:String,unique:true,required:true},
    image:String,
    title:{type:String,required:true},
    city:String,
  zones: [
    {
      address: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
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