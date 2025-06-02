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
  sell_price: { type: Number},
 discountValue: { type: Number, default: 0 }
},{strict:false});

const productSchema = new mongoose.Schema({
  productName: { type: String},
  description: String,
   mrp: { type: Number },
  sell_price: { type: Number},
   sku: { type: String },
  productImageUrl: [{ type: String }],
  productThumbnailUrl:{type:String},
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
  brand_Name: {
    _id: { type: mongoose.Schema.Types.ObjectId ,ref:'brands'},
    name:String
  },
  location:  [locationSchema],
  tax: String,
  minQuantity:Number,
  maxQuantity:Number,
  unit:[String],
  online_visible: { type: Boolean, default: true },
  feature_product: { type: Boolean, default: false },
  fulfilled_by: String,
  inventory: { type: String, enum: ['InStock', 'OutOfStock'],default:'OutOfStock' },
  variants: [variantSchema],
  purchases:{type:Number,default:0}
}, { timestamps: true });

productSchema.pre('save', function (next) {
  const taxPercent = parseFloat(this.tax) || 0;

  this.variants = this.variants.map(variant => {
    if (variant.sell_price) {
      const taxedPrice = variant.sell_price + (variant.sell_price * taxPercent / 100);
      variant.sell_price = Math.round(taxedPrice * 100) / 100; // round to 2 decimal places
    }
     if (this.mrp && variant.sell_price) {
      const discount = ((this.mrp - variant.sell_price) / this.mrp) * 100;
      variant.discountValue = Math.round(discount);
    } else {
      variant.discountValue = 0;
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
