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

const settingAdminSchema = new mongoose.Schema({
Owner_Name: { type: String },
Owner_Email:String,
Owner_Number: { type: Number },
Store_Number: { type: Number },
Password:String,
Platform_Fee:String,
GST_Number:String,
Description:String,
Delivery_Charges:Number,
Delivery_Charge_Per_Km:Number,
Minimum_Delivery_Charges:Number,
Minimum_Delivery_Charge_Within_Km:Number
});

module.exports ={
 Settings: mongoose.model("Settings", settingSchema),
 SettingAdmin: mongoose.model("SettingAdmin", settingAdminSchema,'settings')
} 
