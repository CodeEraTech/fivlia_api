const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
    pageTitle: String,
    pageSlug: String,
    pageContent: String,
    status: { type: Boolean, default: true },
});

module.exports = mongoose.model('pages', pageSchema)

