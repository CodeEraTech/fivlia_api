const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName:{type:String,required:true},
    description:String,
    productImageUrl:{type:String,required:true},
    category:String,
    subCategory: { type: String },
    subSubCategory:String,
    sku: { type: String,unique:true },
    ribbon:{type:String,enum:['offer','normal'],default:'normal'},
    mrp:String,
    brand_Name:String,
    sold_by:String,
    type:String,
    size:[String],
    color:[String],
    location:[String],
    online_visible:{type:Boolean,default:true},
    discountMode:String,
    inventory:{type:String,required:true,enum:['InStock','OutOfStock']},
    discountValue:String,
    
},{timestamps:true})
module.exports=mongoose.model('Products',productSchema)