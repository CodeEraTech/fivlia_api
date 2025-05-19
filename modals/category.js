const mongoose = require('mongoose');

const subSubCategorySchema = new mongoose.Schema({
  id: Number,
  CategoryHeading: String,
  Selection: String,
  image: String,
  ItemsNo: Number,
  Products: Array
}, { _id: false });

const subCategorySchema = new mongoose.Schema({
  id: Number,
  CategoryHeading: String,
  Selection: String,
  image: String,
  ItemsNo: Number,
  Products: Array,
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
  Products: Array,
  subCategory: {
    type: Map,
    of: subCategorySchema
  }
});

module.exports = mongoose.model('Category', categorySchema,'Categories');
