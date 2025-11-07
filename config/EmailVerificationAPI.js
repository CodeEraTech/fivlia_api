const jwt = require("jsonwebtoken");
const Store = require("../modals/store");
const { sendVerificationEmailLink } = require("./nodeMailer"); // adjust path

// 1️⃣ Send verification email API
exports.sendEmailVerification = async (req, res) => {
  try {
    const { storeId,apiUrl } = req.query;
    if (!storeId) return res.status(400).json({ success: false, message: "storeId is required" });

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ success: false, message: "Store not found" });

    if (store.emailVerified) {
      return res.status(400).json({ success: false, message: "Email already verified" });
    }

    const token = jwt.sign({ storeId: store._id }, process.env.jwtSecretKey, { expiresIn: "1h" });
    const verifyUrl = `${apiUrl}/verify-email?token=${token}`;


    // Send beautiful email
    await sendVerificationEmailLink(store.email, store.ownerName || "", "", verifyUrl);

    return res.status(200).json({
      success: true,
      message: `Verification link sent to ${store.email}`,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// 2️⃣ Verify email API
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: "Token missing" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const store = await Store.findById(decoded.storeId);
    if (!store) return res.status(404).json({ success: false, message: "Store not found" });

    if (store.emailVerified) {
      return res.redirect("https://seller.fivlia.in/seller-login?verified=true");
    }

    store.emailVerified = true;
    await store.save();

    // Redirect to seller login after successful verification
    return res.redirect("https://seller.fivlia.in/seller-login?verified=true");
  } catch (error) {
    console.error("Email verify error:", error);
    return res.redirect("https://seller.fivlia.in/seller-login?verified=false");
  }
};
