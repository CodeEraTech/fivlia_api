// models/Product.js
const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  mrp: { type: Number, required: true },
  sell_price: { type: Number, required: true },
  size: { type: String },
  color: { type: String },
  pack: { type: String },
  discountValue: {
    type: Number,
    default: function () {
      if (this.mrp && this.sell_price) {
        const discount = ((this.mrp - this.sell_price) / this.mrp) * 100;
        return Math.round(discount); // auto-calculate if not provided
      }
      return 0;
    },
  }
}, { _id: false });

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  description: String,
  productImageUrl: [{ type: String, required: true }],
  category: String,
  subCategory: String,
  subSubCategory: String,
  sku: { type: String, unique: true },
  ribbon: String,
  brand_Name: String,
  sold_by: String,
  type: String,
  location: [String],
  ratings: {avg: Number,count: Number},
  tax: String,
  online_visible: { type: Boolean, default: true },
  feature_product: { type: Boolean, default: false },
  fulfilled_by: String,
  inventory: { type: String, required: true, enum: ['InStock', 'OutOfStock'] },
  variants: [variantSchema]
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
