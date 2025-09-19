const { firebase } = require('googleapis/build/src/apis/firebase');
const mongoose = require('mongoose');

const settingAdminSchema = new mongoose.Schema({
Owner_Name: { type: String },
Owner_Email:String,
Owner_Number: { type: Number },
links:{ 
  about_us: { type: String },
  privacy_Policy:String,
  termAndCondition:String,
  seller:String
},
Password:String,
Platform_Fee:Number,
codLimit:Number,
GST_Number:String,
Description:String,
Delivery_Charges:Number,
DeliveryStatus:String,
Auth:[{firebase:{status:Boolean},whatsApp:{appKey:String,authKey:String,status:Boolean}}],
PaymentGateways:{RazorPayKey:{test:String,live:String,secretKey:String,status:Boolean},PhonePe:{test:String,live:String,secretKey:String,status:Boolean}},
PaymentGatewayStatus:Boolean,
Map_Api:[{google:{api_key:String,status:Boolean},apple:{api_key:String,status:Boolean}, ola:{api_key:String,status:Boolean}}],
minPrice:Number,
maxPrice:Number,
minWithdrawal:Number,
imageLink:String,
freeDeliveryLimit:Number
});

module.exports ={
 SettingAdmin: mongoose.model("SettingAdmin", settingAdminSchema)
}

