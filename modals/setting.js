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
links:{ 
  about_us: { type: String },
  privacy_Policy:String,
  termAndCondition:String
},
Password:String,
Platform_Fee:Number,
codLimit:Number,
GST_Number:String,
Description:String,
Delivery_Charges:Number,
DeliveryStatus:String,
PaymentGateways:{RazorPayKey:{test:String,live:String,status:Boolean},PhonePe:{test:String,live:String,status:Boolean}},
PaymentGatewayStatus:Boolean
});

module.exports ={
 Settings: mongoose.model("Settings", settingSchema),
 SettingAdmin: mongoose.model("SettingAdmin", settingAdminSchema)
}

