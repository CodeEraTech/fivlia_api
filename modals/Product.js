// models/Product.js
const mongoose = require('mongoose');
const { required } = require('zod/v4-mini');

const locationSchema=new mongoose.Schema({
  city:{ _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Locations' },
      name:String},
  zone:{_id: { type: mongoose.Schema.Types.ObjectId, },
      name:String}
})

const variantSchema = new mongoose.Schema({
  mrp: { type: Number, required: true },
  sell_price: { type: Number, required: true },
  ratings: {avg: Number,count: Number},
  sku: { type: String },
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
},{strict:false});

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  description: String,
  productImageUrl: [{ type: String, required: true }],
  productThumbnailUrl:{type:String, required:true},
  category: [{
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Categories' },
      name:String
  }],
  subCategory:[{
    _id: { type: mongoose.Schema.Types.ObjectId },
    name:String
  }],
  subSubCategory: [ {_id: { type: mongoose.Schema.Types.ObjectId },name:String}],
  ribbon: String,
  brand_Name: [{
    _id: { type: mongoose.Schema.Types.ObjectId ,ref:'brands'},
    name:String
  }],
  purchases:Number,
  type: String,
  location:  [locationSchema],
  tax: String,
  minQuantity:Number,
  maxQuantity:Number,
  unit:[String],
  online_visible: { type: Boolean, default: true },
  feature_product: { type: Boolean, default: false },
  fulfilled_by: String,
  inventory: { type: String, required: true, enum: ['InStock', 'OutOfStock'],default:'OutOfStock' },
  variants: [variantSchema]
}, { timestamps: true });

productSchema.pre('save', function (next) {
  const taxPercent = parseFloat(this.tax) || 0;

  this.variants = this.variants.map(variant => {
    if (variant.sell_price) {
      const taxedPrice = variant.sell_price + (variant.sell_price * taxPercent / 100);
      variant.sell_price = Math.round(taxedPrice * 100) / 100; // round to 2 decimal places
    }
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
