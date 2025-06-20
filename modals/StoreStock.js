const mongoose = require('mongoose');

const StoreStockSchema = new mongoose.Schema({
 storeId:{type:mongoose.Schema.ObjectId,ref:'stores'},
 stock:[{productId:{type:mongoose.Schema.ObjectId,ref:'products'},variantId:{type:mongoose.Schema.ObjectId},quantity:Number}]
});

module.exports = mongoose.model('Stock', StoreStockSchema);