const {generateInvoice} = require('../config/invoice');
const {Order} = require('../modals/order')
const User = require('../modals/User');
const {SettingAdmin} = require('../modals/setting')
const request = require('request');

module.exports = (agenda) => {
  agenda.define('generate-invoice-and-send-whatsapp', async (job) => {
    const { orderId } = job.attrs.data;

    try {
      const order = await Order.findOne({ orderId });
      if (!order) throw new Error('Order not found');

      const user = await User.findById(order.userId);
      if (!user) throw new Error('User not found');

      const invoiceUrl = await generateInvoice({
        name: user.name || "Customer",
        orderId,
        amount: order.totalAmount || 0
      });

      await Order.findOneAndUpdate({ orderId }, { invoiceUrl });

      const setting = await SettingAdmin.findOne();
      const authSettings = setting?.Auth?.[0] || {};

      const options = {
        method: 'POST',
        url: 'https://msggo.in/wapp/public/api/create-message',
        headers: {},
        formData: {
          appkey: authSettings.whatsApp.appKey,
          authkey: authSettings.whatsApp.authKey,
          to: user.mobileNumber,
          message: `Your order has been delivered!\nInvoice: ${invoiceUrl}`,
        },
      };

      request(options, function (error, response) {
        if (error) {
          console.error('WhatsApp message error:', error);
        } else {
          console.log('WhatsApp invoice sent to', user.mobileNumber);
        }
      });
    } catch (err) {
      console.error('Agenda job error:', err);
    }
  });
};
