const mongoose = require('mongoose');

const storeScheema = new mongoose.Schema({
    storeName: String,
    city: { _id: { type: mongoose.Schema.ObjectId, ref: 'Locations' }, name: String },
    ownerName: String,
    PhoneNumber: String,
    email: String,
    password: String,
    zone: [{ _id: { type: mongoose.Schema.ObjectId, ref: 'Locations' }, name: String, title: String, latitude: Number, longitude: Number, range: Number }],
    Latitude: String,
    Longitude: String,
    status: { type: Boolean, default: true },
    Description: String,
    wallet: Number,
    Authorized_Store: { type: Boolean, default: true },
    Category: [{ type: mongoose.Schema.ObjectId, ref: 'Category' }],
    image: String,
    aadharCard: [String],
    panCard: [String],
    sellFood:{type:Boolean},
    fsiNumber:String,
    fullAddress:String,
    gstNumber: String,
    emailVerified: { type: Boolean, default: false },
    phoneNumberVerified: { type: Boolean, default: false },
    approveStatus: { type: String, enum: ['pending_verification', 'pending_admin_approval', 'approved', 'rejected'], default: 'pending_verification' },
    verificationToken: String,
    pendingAddressUpdate: {
    city: { _id: { type: mongoose.Schema.ObjectId, ref: 'Locations' }, name: String },
    zone: [{ _id: { type: mongoose.Schema.ObjectId, ref: 'Locations' }, name: String, title: String, latitude: Number, longitude: Number, range: Number }],
    Latitude:String,
    Longitude:String,
    requestedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
  },
    bankDetails:{bankName:String,accountHolder:String,accountNumber:Number,ifsc:String,branch:String},
    sellerCategories: [
        {
            categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
            subCategories: [
                {
                    subCategoryId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'SubCategory',
                        default: null,
                        required: false,
                    },
                    subSubCategories: [
                        {
                            subSubCategoryId: {
                                type: mongoose.Schema.Types.ObjectId,
                                ref: 'SubSubCategory',
                                default: null,
                                required: false,
                            },
                        },
                    ],
                },
            ],
        },
    ],
}, { timestamps: true })

module.exports = mongoose.model('Store', storeScheema)

