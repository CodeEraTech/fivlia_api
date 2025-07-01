async function sendNotification(fcmToken, title, body) {
  const token = await getAccessToken();

  const fcmUrl = `https://fcm.googleapis.com/v1/projects/fivlia/messages:send`;

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
      }
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
