const mongoose = require("mongoose");
const moment = require("moment-timezone");

const transactionSchema = new mongoose.Schema(
  {
    driverId: { type: mongoose.Schema.ObjectId, ref: "drivers" },
    amount: { type: Number },
    orderId: { type: mongoose.Schema.ObjectId, ref: "orders" },
    type: String,
    description: String,
    status: String,
  },
  { timestamps: true }
);

transactionSchema.set("toJSON", {
  transform: (doc, ret) => {
    if (ret.createdAt)
      ret.createdAt = moment(ret.createdAt)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm:ss");
    if (ret.updatedAt)
      ret.updatedAt = moment(ret.updatedAt)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm:ss");
    return ret;
  },
});

module.exports = mongoose.model("Driver_Transaction", transactionSchema);
