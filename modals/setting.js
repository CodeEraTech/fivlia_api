const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  store_locator: { type: String },

  orders: {
    label: { type: String, default: "Orders" },
    ref: { type: mongoose.Schema.Types.ObjectId, ref: "orders" }
  },

  address_book: {
    label: { type: String, default: "Address Book" },
    ref: { type: mongoose.Schema.Types.ObjectId, ref: "Login" }
  },

  gift_card: { type: String },
  discount_calculator: { type: String },
  shopping_list: { type: String },

  reward_and_discount_program:String,

  share_the_app: { type: String },
  about_us: { type: String },
  logout: { type: String }
});

module.exports = mongoose.model("Settings", settingSchema);
