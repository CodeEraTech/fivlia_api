const cron = require('node-cron');
const Notification = require('../../modals/Notification');

cron.schedule('* * * * *',async () => {
  const now = new Date()
const notification = await Notification.find({
  launchTime:{$lte:now},
  sent:false
})

for(const notf of notification){
  console.log(`Sending: , ${notf.title}`);
    notif.sent = true
    await notf.save()
}

})