const mongoose = require('mongoose');
const slugify = require('slugify');

const charityContentSchema = new mongoose.Schema({

    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'charity',
        required: true
    },

    title: {
        type: String,
        required: true,
        trim: true
    },

    slug: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true
    },

    shortDescription: {
        type: String,
        required: true,
        maxlength: 250,
        trim: true
    },

    content: {
        type: String,
        required: true, // full HTML / text content
    },

    image: {
        type: String,
        default: null // thumbnail / main image
    },

    gallery: {
        type: [String], // array of image paths
        default: []
    },

    videoUrl: {type: String,default: null},

    status: {type: Boolean,default: true}

}, { timestamps: true });


// Auto-generate slug from title
charityContentSchema.pre('save', function (next) {
    if (this.isModified('title')) {
        this.slug = slugify(this.title, {
            lower: true,
            strict: true,
            trim: true
        });
    }
    next();
});

module.exports = mongoose.model('charityContent', charityContentSchema);
