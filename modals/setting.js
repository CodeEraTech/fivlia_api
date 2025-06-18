const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({

  platform_Fee:String,
  links:{ 
  about_us: { type: String },
    privacy_Policy:String,
  termAndCondition:String
},
  contactUs:String
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
Minimum_Delivery_Charge_Within_Km:Number,
DeliveryStatus:String
});

module.exports ={
 Settings: mongoose.model("Settings", settingSchema),
 SettingAdmin: mongoose.model("SettingAdmin", settingAdminSchema)
} 
