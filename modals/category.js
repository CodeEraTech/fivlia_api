// models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  image: { type: String, required: true },
  CategoryHeading: { type: String, required: true },
  Selection: { type: String, enum: ["Main", "Sub", "Sub-Sub"], required: true },

  subCategory: {
    type: Map,
    of: new mongoose.Schema({
      subSubCategory: {
        type:Object,
        default: {}
      }
    }),
    default: {}
  },

  ItemsNo: { type: Number, required: true },
  id: { type: Number, required: true, unique: true }
});

module.exports = mongoose.model('Category', categorySchema);
