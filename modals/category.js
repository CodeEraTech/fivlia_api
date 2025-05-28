const mongoose = require('mongoose');

const subSubCategorySchema = new mongoose.Schema({
  name:String,
  Selection: String,
  description:String,
  image: String,
});

const subCategorySchema = new mongoose.Schema({
  name:String,
  Selection: String,
  image: String,
  description:String,
  subSubCat:[subSubCategorySchema]
});

const categorySchema = new mongoose.Schema({
  name:String,
  Selection: String,
  image: String,
  description:String,
  subcat: [subCategorySchema]
});
const Category=mongoose.model('Category', categorySchema,'Categories');
module.exports = Category
