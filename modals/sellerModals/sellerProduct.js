const mongoose = require('mongoose');

const sellerProductSchema = new mongoose.Schema({
   sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'stores' },
   product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'products' },
   sell_price: Number,
   mrp: Number,
   stock: Number,
   status: { type: Boolean, default: false }
}, { timestamps: true })
module.exports = mongoose.model('sellerProduct', sellerProductSchema)