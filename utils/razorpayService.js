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

const getCommison = async (productId) => {
  if (!productId) throw new Error("ProductId is required");

  const product = await Product.findById(productId).lean();
  if (!product) throw new Error("Product not found");

  let commission = 0;

  const categoryId = product.category?.[0]?._id;
  if (!categoryId) return 0;

  const category = await Category.findById(categoryId).lean();
  if (!category) return 0;

  const subCatId = product.subCategory?.[0]?._id;
  const subSubCatId = product.subSubCategory?.[0]?._id;

  if (subCatId) {
    const subcat = category.subcat?.find(
      (s) => String(s._id) === String(subCatId)
    );
    if (subcat) {
      if (subSubCatId && subcat.subsubcat?.length) {
        const subsub = subcat.subsubcat.find(
          (s) => String(s._id) === String(subSubCatId)
        );
        if (subsub?.commison) commission = subsub.commison; // sub-sub priority
      }
      if (!commission && subcat?.commison) {
        commission = subcat.commison; // fallback to sub
      }
    }
  }

  return commission || 0; // default 0 if nothing found
};


module.exports = {
    createRazorpayOrder,
    getCommison
};