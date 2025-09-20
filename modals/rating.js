const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
userId:{type:mongoose.Schema.Types.ObjectId,ref:'Login'},
rating:Number,
productId:{type:mongoose.Schema.Types.ObjectId,ref:'products'},
storeId:{type:mongoose.Schema.Types.ObjectId,ref:'stores'}
});

module.exports=mongoose.model('rating',ratingSchema)

