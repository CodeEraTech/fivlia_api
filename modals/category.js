const mongoose = require('mongoose');

const subSubCategorySchema = new mongoose.Schema({
  id: Number,
  CategoryHeading: String,
  Selection: String,
  image: String,
  ItemsNo: Number,
  Products: [{type: mongoose.Schema.Types.ObjectId, ref: "Product"}]
}, { _id: false });

const subCategorySchema = new mongoose.Schema({
  id: Number,
  CategoryHeading: String,
  Selection: String,
  image: String,
  ItemsNo: Number,
  Products: [{type: mongoose.Schema.Types.ObjectId, ref: "products"}],
  subSubCategory: {
    type: Map,
    of: subSubCategorySchema
  }
}, { _id: false });

const categorySchema = new mongoose.Schema({
  id: Number,
  CategoryHeading: String,
  Selection: String,
  image: String,
  ItemsNo: Number,
  Products: [{type: mongoose.Schema.Types.ObjectId, ref: "products"}] ,
  subCategory: {
    type: Map,
    of: subCategorySchema
  }
});
const Category=mongoose.model('Category', categorySchema,'Categories');
module.exports = Category
