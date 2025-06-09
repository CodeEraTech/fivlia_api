const cron = require('node-cron');
const Notification = require('../../modals/Notification');
const moment = require('moment-timezone');

// Optional: FCM integration (uncomment if needed)
// const sendToFCM = require('./sendToFCM'); // Your FCM send function

// Runs every minute
cron.schedule('* * * * *', async () => {
  try {
    const nowIST = moment().tz("Asia/Kolkata");
    console.log("⏰ Cron job running (IST):", nowIST.format("YYYY-MM-DD HH:mm:ss"));

    // Convert to UTC to match stored notification time
    const nowUTC = nowIST.utc().toDate();

    const notificationsToSend = await Notification.find({
      time: { $lte: nowUTC },
      sent: false
    });

    if (notificationsToSend.length === 0) {
      console.log("📭 No notifications to send at this time.");
      return;
    }

    for (const notif of notificationsToSend) {
      console.log(`🚀 Sending notification: ${notif.title}`);

      // Optional: trigger FCM sending logic
      // await sendToFCM(notif);

      // Mark as sent
      notif.sent = true;
      await notif.save();
    }

    console.log(`✅ Processed ${notificationsToSend.length} notification(s)`);

  } catch (err) {
    console.error("❌ Cron job error:", err.message);
  }
});
