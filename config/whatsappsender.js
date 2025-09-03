   const request = require('request');
   const whatsappOtp = async({PhoneNumber,otp,authSettings}) => {
   var options = {
       method: 'POST',
        url: 'https://msggo.in/wapp/public/api/create-message',
        headers: {},
      formData: {
        'appkey': authSettings.whatsApp.appKey,
        'authkey':authSettings.whatsApp.authKey,
        'to': PhoneNumber,
        'message': `Welcome to Fivlia - Delivery in Minutes!\nYour OTP is ${otp}. Do not share it with anyone.\n\nThis OTP is valid for 30 minutes.`,
      }
    };

   request(options, async function (error, response) {
           if (error) {
             console.error(error);
             return res.status(500).json({ message: 'Failed to send OTP via WhatsApp' });
           }
})
}
module.exports={whatsappOtp}