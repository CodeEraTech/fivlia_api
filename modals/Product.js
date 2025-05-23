// models/Product.js
const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  mrp: { type: Number, required: true },
  sell_price: { type: Number, required: true },
  size: { type: String },
  color: { type: String },
  sku: { type: String, unique: true },
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
});

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  description: String,
  productImageUrl: [{ type: String, required: true }],
  category: [{
    id:{type:mongoose.Schema.Types.ObjectId},
    name:String
  }],
  subCategory:[{
    id:{type:mongoose.Schema.Types.ObjectId},
   name:String
  }],
  subSubCategory: [String],
  // stock:String,
  addVarient:[String],
  selectVarientValue:[String],
  ribbon: String,
  brand_Name: String,
  purchases:Number,
  sold_by: String,
  type: String,
  location: [String],
  ratings: {avg: Number,count: Number},
  tax: String,
  minQuantity:Number,
  maxQuantity:Number,
  online_visible: { type: Boolean, default: true },
  feature_product: { type: Boolean, default: false },
  fulfilled_by: String,
  inventory: { type: String, required: true, enum: ['InStock', 'OutOfStock'] },
  variants: [variantSchema]
}, { timestamps: true });

productSchema.pre('save', function (next) {
  const taxPercent = parseFloat(this.tax) || 0;

  // Handle MRP & Dynamic Fields
  this.variants = this.variants.map(variant => {
    // Calculate MRP
    variant.mrp = Math.round((variant.sell_price + (variant.sell_price * taxPercent / 100)) * 100) / 100;

    // Dynamically assign variant fields
    if (this.addVarient && this.selectVarientValue) {
      this.selectVarientValue.forEach(entry => {
        const [key, value] = entry.split(':');
        if (this.addVarient.includes(key)) {
          variant[key] = value;
        }
      });
    }

    return variant;
  });

  next();
});



module.exports = mongoose.model('Product', productSchema);
