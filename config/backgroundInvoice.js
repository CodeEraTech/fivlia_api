const { generateInvoice } = require("../config/invoice");
const { Order } = require("../modals/order");
const User = require("../modals/User");
const { SettingAdmin } = require("../modals/setting");
const request = require("request");
const { sendMessages } = require("../utils/sendMessages");

module.exports = (agenda) => {
  agenda.define("generate-invoice-and-send-whatsapp", async (job) => {
    const { orderId } = job.attrs.data;

    try {
      const order = await Order.findOne({ orderId });
      if (!order) throw new Error("Order not found");

      const user = await User.findById(order.userId);
      if (!user) throw new Error("User not found");

      const invoiceUrl = await generateInvoice({
        name: user.name || "Customer",
        orderId,
        amount: order.totalAmount || 0,
      });

      await Order.findOneAndUpdate({ orderId }, { invoiceUrl });

      const message = `Your Fivlia order #${orderId} has been delivered! Invoice: ${pdfUrl} Download Invoice: ${order.storeInvoiceId} Total Amount: ${order.totalPrice} Thank you for choosing Fivlia - Delivery in Minutes! Rate your experience on our app!`;

      await sendMessages(user.mobileNumber, message, "1707176060687281700");
    } catch (err) {
      console.error("Agenda job error:", err);
    }
  });
};
