const mongoose = require('mongoose');
const slugify = require('slugify');

const charitySchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true
    },
    shortDescription: String,
    content: String,
    image: String,
    slug: {
        type: String,
        unique: true
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });


// Auto-create slug before saving
charitySchema.pre('save', function(next) {
    if (this.isModified('title')) {
        this.slug = slugify(this.title, {
            lower: true,
            strict: true,
            trim: true
        });
    }
    next();
});

module.exports = mongoose.model('charity', charitySchema);
