const axios = require("axios");
const getAccessToken = require("./getAccessToken"); // adjust path

async function sendNotification(fcmToken, title, body,clickAction = "/dashboard1", data = {}) {
  const token = await getAccessToken();

  const fcmUrl = `https://fcm.googleapis.com/v1/projects/fivlia-quick-commerce/messages:send`;

  const message = {
    message: {
      token: fcmToken,
      notification: {
        title: title,
        body: body
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...data
      },
            webpush: {
        notification: {
          title,
          body,
          icon: "/logo192.png",
        },
        fcmOptions: {
          link: clickAction,         // 👈 this is what firebase-messaging-sw.js uses
        },
      },
    }
  };

  try {
    const response = await axios.post(fcmUrl, message, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    console.log("✅ Notification sent:", response.data);
  } catch (err) {
    console.error("❌ Sending error:", err.response?.data || err.message);
  }
}

module.exports = sendNotification;
