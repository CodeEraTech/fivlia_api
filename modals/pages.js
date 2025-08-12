const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
pageTitle:String,
pageSlug:String,
pageContent:String,
});

module.exports=mongoose.model('pages',pageSchema)

