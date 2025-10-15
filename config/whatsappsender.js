   const request = require('request');
   const OtpModel = require("../modals/otp")
//    const whatsappOtp = async({PhoneNumber,otp,authSettings}) => {
//    var options = {
//        method: 'POST',
//         url: 'https://msggo.in/wapp/public/api/create-message',
//         headers: {},
//       formData: {
//         'appkey': authSettings.whatsApp.appKey,
//         'authkey':authSettings.whatsApp.authKey,
//         'to': PhoneNumber,
//         'message': `Welcome to Fivlia - Delivery in Minutes!\nYour OTP is ${otp}. Do not share it with anyone.\n\nThis OTP is valid for 30 minutes.`,
//       }
//     };

//    request(options, async function (error, response) {
//            if (error) {
//              console.error(error);
//              return res.status(500).json({ message: 'Failed to send OTP via WhatsApp' });
//            }
// })
// }

const whatsappOtp = async({mobileNumber,otp,authSettings}) => {
    const axios = require('axios');
    const params = {
        api_key: "y6SJdAQ3AO",
        instance_key: "qpiEonZKXG",
        numbers: mobileNumber,
        name: 'customer',
        message: `Welcome to Fivlia!\nYour OTP is ${otp}. Do not share it with anyone.`,
        type: 0
    };
    try {
        const response = await axios.get('https://whatsappbulkapi.com/api/send', { params });
        await OtpModel.create({ mobileNumber, otp, expiresAt: Date.now() + 5 * 60 * 1000 });
        return response;
    } catch (error) {
        console.error("WhatsApp API error:", error.message);
    }
  }
  
module.exports={whatsappOtp}