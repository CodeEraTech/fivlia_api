const mongoose = require('mongoose');

const subSubCategorySchema = new mongoose.Schema({
  name:String,
  Selection: String,
  description:String,
  image: String,
  attribute:[{type:String}],
  status:{type:Boolean,default:true},
  commison:Number
});

const subCategorySchema = new mongoose.Schema({
  name:String,
  Selection: String,
  image: String,
  description:String,
  subsubcat:[subSubCategorySchema],
  attribute:[{type:String}],
  status:{type:Boolean,default:true},
  commison:Number
});

const categorySchema = new mongoose.Schema({
  name:String,
  Selection: String,
  image: String,
  description:String,
  subcat: [subCategorySchema],
  attribute:[{type:String}],
  filter: [{_id: { type: mongoose.Schema.Types.ObjectId },Filter_name: { type: String },
 selected: [{_id: { type: mongoose.Schema.Types.ObjectId },name: { type: String }}],
 }],
  status:{type:Boolean,default:true}
});
const Category=mongoose.model('Category', categorySchema,'Categories');
module.exports = Category

//isme filter ka system banana dikhe navi schema banegi shayad