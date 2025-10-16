const axios = require("axios");
const { SettingAdmin } = require("../modals/setting");

const sendMessages = async (phoneNumber, message) => {
  if (!phoneNumber || !message) {
    throw new Error("Missing phone number or message.");
  }

  const setting = await SettingAdmin.findOne();
  const authSettings = setting?.Auth?.[0];

  if (!authSettings) throw new Error("Missing Auth settings in database.");

  const { firebase, whatsApp, whatsAppBulk } = authSettings;

  try {
    if (whatsApp?.status == false) {
      const response = await axios.post(
        "https://msggo.in/wapp/public/api/create-message",
        null,
        {
          params: {
            appkey: whatsApp.appKey,
            authkey: whatsApp.authKey,
            to: phoneNumber,
            message,
          },
          timeout: 10000,
        }
      );

      return { service: "MsgGo", success: true, raw: response.data };
    }

    if (true) {    //whatsAppBulk?.status
      const response = await axios.get("https://whatsappbulkapi.com/api/send", {
        params: {
          api_key: "y6SJdAQ3AO",
          instance_key: "qpiEonZKXG",
          numbers: phoneNumber,
          name: "customer",
          message,
          type: 0,
        },
        timeout: 10000,
      });

      return { service: "WhatsAppBulkAPI", success: true, raw: response.data };
    }

    if (firebase?.status) {
      console.info("Firebase Info: Config not available.");
      return { service: "Firebase", success: false };
    }

    throw new Error("No active messaging service found.");
  } catch (error) {
    console.error("Message Send Error:", error.message);
    throw error;
  }
};

module.exports = { sendMessages };
