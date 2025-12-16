const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: String,
    type: {
      type: String,
      enum: ["order", "seller", "driver", "wallet", "general"],
      default: "general",
    },
    sendType: {
        type: String,
        enum: ["seller", "driver", "user", "all"],
        default: "user",
    },
    description: String,
    data: { type: Object, default: {} },
    isRead: { type: Boolean, default: false },
    image: String,
    city: [{type: String}],
    zone: [{type: String}],
    screen: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("notification", notificationSchema);
