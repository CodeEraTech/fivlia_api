const Razorpay = require("razorpay");
const { SettingAdmin } = require("../modals/setting");
const Product = require('../modals/Product'); // Adjust path
const Category = require('../modals/category'); // Adjust path if needed

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

exports.getCommison = async (req, res) => {
  try {
    const { productId } = req.query; // assuming productId is passed as query param
    if (!productId) return res.status(400).json({ message: 'ProductId is required' });

    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let commission = 0;

    // 1️⃣ Check subSubCategory commission first
    if (product.subSubCategory && product.subSubCategory.length > 0) {
      const subSubCatId = product.subSubCategory[0]._id; // pick the first one
      // Find subSubCat in category tree
      const subcat = product.subCategory?.[0]; // first subCategory
      if (subcat) {
        const subSubCat = subcat.subsubcat?.find(s => String(s._id) === String(subSubCatId));
        if (subSubCat && typeof subSubCat.commison === 'number') {
          commission = subSubCat.commison;
        }
      }
    }

    // 2️⃣ Fallback to subCategory commission if no subSubCategory commission
    if (commission === 0 && product.subCategory && product.subCategory.length > 0) {
      const subcat = product.subCategory[0];
      if (typeof subcat.commison === 'number') {
        commission = subcat.commison;
      }
    }

    return res.status(200).json({ productId, commission });

  } catch (error) {
    console.error("❌ Get Commission Error:", error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};


module.exports = {
    createRazorpayOrder,
};