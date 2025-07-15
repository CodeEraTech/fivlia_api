const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
userInfo:{userId:{type:mongoose.Schema.Types.ObjectId,ref:'Login'},userName:String},
rating:Number,
order_id:{type:mongoose.Schema.Types.ObjectId,ref:'Order'},
Note:String
});

module.exports=mongoose.model('rating',ratingSchema)

