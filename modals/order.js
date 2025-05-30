const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        default: 1
      },
      price: {
        type: Number,
        required: true
      },
      variant: {
        type: String
      }
    }
  ],

  address: {
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    landmark: { type: String },
    type: { type: String, enum: ['home', 'work', 'other'], default: 'home' }
  },

cashOnDelivery: { type: Boolean, default: true },

  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending'
  },

  orderType: {
    type: String,
    enum: ['Delivery', 'Pickup'],
    default: 'Delivery'
  },

  orderStatus: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },

  orderPlacedFrom: {
    type: String,
    enum: ['Web', 'App', 'POS'],
    default: 'Web'
  },

  totalAmount: {
    type: Number,
    required: true
  },

  discount: {
    type: Number,
    default: 0
  },

  finalAmount: {
    type: Number,
    required: true
  },

  notes: {
    type: String
  },

  isCancelled: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
