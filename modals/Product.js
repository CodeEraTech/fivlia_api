// models/Product.js
const mongoose = require('mongoose');
const { required } = require('zod/v4-mini');
const { quantity } = require('../controlers/cartControler');

const locationSchema=new mongoose.Schema({
  city:[{ _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Locations' },
      name:String}],
  zone:[{_id: { type: mongoose.Schema.Types.ObjectId, },
      name:String}]
})

const variantSchema = new mongoose.Schema({
  sell_price: { type: Number},
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
  type:String,
  maxQuantity:Number,
  unit: {_id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  name: { type: String }},
  online_visible: { type: Boolean, default: true },
  feature_product: { type: Boolean, default: false },
  fulfilled_by: String,
  returnProduct:{image:String,title:String,  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() }},
 inventory: [{
  variantId: { type: mongoose.Schema.Types.ObjectId },
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },quantity: { type: Number, default: 0 },
 storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'stores',
  },
}],

  rating:{rate:{type:Number, default:4.5},users:{type:Number,default:10},_id:{type:mongoose.Schema.Types.ObjectId,auto: true}},//object with user count
  variants: [variantSchema],
  filter: [{_id: { type: mongoose.Schema.Types.ObjectId },Filter_name: { type: String },
selected: [{_id: { type: mongoose.Schema.Types.ObjectId },name: { type: String }}],

}],
 //ye chakni hai category se
  purchases:{type:Number,default:0},
  status:{type:Boolean,default:true}
}, { timestamps: true });

productSchema.pre('save', function (next) {
  if (this.mrp && this.sell_price) {
    const discount = ((this.mrp - this.sell_price) / this.mrp) * 100;
    this.discountValue = Math.round(discount);
  } else {
    this.discountValue = 0;
  }

  next();
});




module.exports = mongoose.model('Product', productSchema);
