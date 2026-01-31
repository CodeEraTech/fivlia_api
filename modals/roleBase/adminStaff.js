const mongoose = require("mongoose");

const AdminStaffSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String },
    password: { type: String },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "role",
    },

    fcmToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AdminStaff", AdminStaffSchema);
