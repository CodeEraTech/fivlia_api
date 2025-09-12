const Razorpay = require("razorpay");
const { SettingAdmin } = require("../modals/setting");

async function createRazorpayOrder(amount, currency = "INR", receipt = null, notes = {}) {
    try {
        const settings = await SettingAdmin.findOne({}, "PaymentGateways").lean();
        if (!settings || !settings.PaymentGateways || !settings.PaymentGateways.RazorPayKey.live || !settings.PaymentGateways.RazorPayKey.secretKey) {
            throw new Error("Razorpay keys not found in settings");
        }
        const razorpay = new Razorpay({
            key_id: settings.PaymentGateways.RazorPayKey.live,
            key_secret: settings.PaymentGateways.RazorPayKey.secretKey,
        });
        const options = {
            amount: Math.round(amount * 100),
            currency,
            receipt: receipt || `receipt_${Date.now()}`,
            notes,
        };
        const order = await razorpay.orders.create(options);
        return order;
    } catch (error) {
        console.error("❌ Razorpay Order Error:", error);
        throw new Error(error.message || "Failed to create Razorpay order");
    }
}

module.exports = {
    createRazorpayOrder,
};