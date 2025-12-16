const mongoose = require('mongoose');

const bulkOrderRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Login" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    status: {
      type: String,
      enum: ["pending", "completed", "converted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BulkOrderRequest", bulkOrderRequestSchema);

