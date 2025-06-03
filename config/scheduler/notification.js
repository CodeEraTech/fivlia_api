const cron = require('node-cron');
const Notification = require('../../modals/Notification');
const moment = require('moment-timezone');

cron.schedule('* * * * *',async () => {
    console.log("⏰ Cron job running (IST):", moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"));
  const now = new Date()
const notification = await Notification.find({
  time:{$lte:now},
  sent:false
})

for(const notf of notification){
  console.log(`🚀 Sending notification: , ${notf.title}`);
    notf.sent = true
    await notf.save()
}

})