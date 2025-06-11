const admin = require('../firebase/firebase'); // adjust path

const sendPushNotification = async (token, title, body, data = {}) => {
  if (!token) {
    console.warn('⚠️ No FCM token provided');
    return;
  }

  const message = {
    token,
    notification: {
      title,
      body,
    },
    data: Object.entries(data).reduce((acc, [key, val]) => {
      acc[key] = String(val); // Firebase requires all values as strings
      return acc;
    }, {}),
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Push notification sent:', response);
     return response;
  } catch (error) {
    console.error('❌ Error sending push notification:', error.message);
  }
};

module.exports = sendPushNotification;
