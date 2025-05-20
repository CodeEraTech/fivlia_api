const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName:{type:String,required:true},
    description:String,
    productImageUrl:{type:String,required:true},
    category:String,
    subCategory: { type: String },
    subSubCategory:String,
    sku: { type: String,unique:true },
    ribbon:{type:String},
    mrp:Number,
    sell_price:Number,
    discountValue:Number,
    brand_Name:String,
    sold_by:String,
    type:String,
    size:[String],
    color:[String],
    location:[String],
    pack:[String],
    tax:Number,
    online_visible:{type:Boolean,default:true},
    feature_product:{type:Boolean,default:false},
    fulfilled_by:String,
    inventory:{type:String,required:true,enum:['InStock','OutOfStock']},
    
},{timestamps:true})
module.exports=mongoose.model('Products',productSchema)