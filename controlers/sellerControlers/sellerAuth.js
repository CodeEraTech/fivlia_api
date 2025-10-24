const seller = require("../../modals/store");
const sendNotification = require("../../firebase/pushnotification");
const { SettingAdmin } = require("../../modals/setting");
const { ZoneData } = require("../../modals/cityZone");
const {sendVerificationEmail} = require("../../config/nodeMailer");
const OtpModel = require("../../modals/otp");
const request = require("request");
const crypto = require("crypto");
const { otpTemplate } = require("../../utils/emailTemplates");
const Products = require("../../modals/Product");
const CategoryModel = require("../../modals/category");
const Stock = require("../../modals/StoreStock");
const jwt = require("jsonwebtoken");
const sellerProduct = require("../../modals/sellerModals/sellerProduct");
const store_transaction = require("../../modals/storeTransaction");
const { requestId } = require("../../config/counter");
const { whatsappOtp } = require("../../config/whatsappsender");
const { sendMessages } = require("../../utils/sendMessages");

exports.addSeller = async (req, res) => {
  try {
    const {
      storeName,
      firstName,
      lastName,
      PhoneNumber,
      email,
      city,
      zone,
      gstNumber,
      fsiNumber,
      Latitude,
      Longitude,
      sellFood,
      fullAddress,
    } = req.body;

    const sellerData = await seller.findOne({
      $or: [{ email }, { PhoneNumber }],
    });
    const setting = await SettingAdmin.findOne();
    const authSettings = setting?.Auth?.[0] || {};
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpEmail = crypto.randomInt(100000, 999999).toString();

    if (sellerData) {
      // Check if email matches and is verified
      if (
        (sellerData.email === email && sellerData.emailVerified === true) ||
        (sellerData.PhoneNumber === PhoneNumber &&
          sellerData.phoneNumberVerified === true)
      ) {
        return res
          .status(409)
          .json({ message: "Email or Mobile number already exists" });
      }
      // If email or phone exists but not verified, send OTP
      try {
        const message = `Dear Customer Your Fivlia Registration OTP code is ${otp}. Valid for 5 minutes. Do not share with others Fivlia - Delivery in Minutes!`;

        await sendMessages(PhoneNumber, message, "1707176060659474352");
        await OtpModel.create({
          email,
          mobileNumber: PhoneNumber,
          otp,
          otpEmail,
          expiresAt: Date.now() + 2 * 60 * 1000,
        });

        await sendVerificationEmail(
          email,
          "Welcome to Fivlia – Your store is under verification",
          otpTemplate(otpEmail)
        );
        return res
          .status(200)
          .json({ message: "OTP sent to email and phone for verification" });
      } catch (err) {
        return res
          .status(500)
          .json({ message: "Failed to send OTP", error: err.message });
      }
    }

    //     const rawImagePath = req.files?.image?.[0]?.key || "";
    //     const image = rawImagePath ? `/${rawImagePath}` : "";
    const aadharCard =
      req.files?.aadharCard?.map((file) => `/${file.key}`) || [];
    const panCard = req.files?.panCard?.map((file) => `/${file.key}`) || [];
    const zones = await ZoneData.find({ "zones._id": { $in: zone } });
    const matchedZones = [];
    zones.forEach((doc) => {
      doc.zones.forEach((z) => {
        if (zone.includes(z._id.toString())) {
          matchedZones.push({
            _id: z._id,
            name: z.zoneTitle,
            title: z.zoneTitle,
            range: z.range,
            latitude: z.latitude,
            longitude: z.longitude,
          });
        }
      });
    });
    const cityObj = { _id: zones[0]._id, name: zones[0].city };
    const newSeller = await seller.create({
      storeName,
      ownerName: `${firstName} ${lastName}`,
      Authorized_Store: false,
      PhoneNumber,
      email,
      aadharCard,
      panCard,
      fsiNumber,
      city: cityObj,
      zone: matchedZones,
      gstNumber,
      approveStatus: "pending_verification",
      Latitude,
      Longitude,
      sellFood,
      fullAddress,
    });

    const message = `Dear Customer Your Fivlia Registration OTP code is ${otp}. Valid for 5 minutes. Do not share with others Fivlia - Delivery in Minutes!`;

    await sendMessages(PhoneNumber, message, "1707176060659474352");
    await OtpModel.create({
      email,
      mobileNumber: PhoneNumber,
      otp,
      expiresAt: Date.now() + 2 * 60 * 1000,
    });

    await sendVerificationEmail(
      email,
      "Welcome to Fivlia – Your store is under verification",
      otpTemplate(otpEmail)
    );

    return res.status(200).json({ message: "OTP sent via WhatsApp And Email" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An Error Occured" });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { PhoneNumber } = req.body;
    const otp = crypto.randomInt(100000, 999999).toString();

    const message = `Dear Customer Your Fivlia Login OTP code is ${otp}. Valid for 5 minutes. Do not share with others Fivlia - Delivery in Minutes!`;

    await sendMessages(PhoneNumber, message, "1707176060665820902");
    await OtpModel.create({
      email,
      mobileNumber: PhoneNumber,
      otp,
      expiresAt: Date.now() + 2 * 60 * 1000,
    });

    return res.status(200).json({ message: "OTP sent via WhatsApp" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ResponseMsg: "An Error Occured" });
  }
};

exports.getSellerRequest = async (req, res) => {
  try {
    const [
      requests,
      locationRequests,
      imageRequest,
      productRequest,
      brandRequest,
    ] = await Promise.all([
      seller
        .find({ approveStatus: "pending_admin_approval" })
        .sort({ createdAt: -1 }),
      seller
        .find({ "pendingAddressUpdate.status": "pending" })
        .sort({ createdAt: -1 }),
      seller
        .find({
          "pendingAdvertisementImages.status": "pending",
          "pendingAdvertisementImages.image.0": { $exists: true },
        })
        .select(
          "storeName email PhoneNumber ownerName zone pendingAdvertisementImages"
        )
        .sort({ createdAt: -1 }),
      Products.find({ sellerProductStatus: "pending_admin_approval" }).sort({
        createdAt: -1,
      }),
      Products.find({ sellerProductStatus: "submit_brand_approval" }).sort({
        createdAt: -1,
      }),
    ]);

    return res.status(200).json({
      message: "Seller Approval Requests",
      requests,
      locationRequests,
      imageRequest,
      productRequest,
      brandRequest,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ResponseMsg: "An Error Occured" });
  }
};

exports.getSeller = async (req, res) => {
  try {
    const { id, page = 1, limit } = req.query;
    const skip = (page - 1) * limit;
    // 1️⃣ Return all approved sellers if no ID
    if (!id) {
      const sellers = await seller
        .find({ approveStatus: "approved" }, { Authorized_Store: false })
        .lean();
      return res.status(200).json({ message: "Sellers Approved", sellers });
    }

    // 2️⃣ Get store info
    const store = await seller.findById(id).lean();
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    // 3️⃣ Collect all category IDs
    const categoryIds = Array.isArray(store.Category)
      ? store.Category
      : [store.Category];

    const allCategoryTrees = [];
    const allCategoryIds = [];

    for (const catId of categoryIds) {
      const category = await CategoryModel.findById(catId).lean();
      if (!category) continue;

      allCategoryTrees.push(category);
      allCategoryIds.push(category._id.toString());

      (category.subcat || []).forEach((sub) => {
        allCategoryIds.push(sub._id.toString());
        (sub.subsubcat || []).forEach((subsub) => {
          allCategoryIds.push(subsub._id.toString());
        });
      });
    }

    // 4️⃣ Fetch stock document for this store
    const storeStockDoc = await Stock.findOne({ storeId: id }).lean();
    const stockEntries = storeStockDoc?.stock || [];

    // Build a map for quick stock lookup
    const stockMap = {};
    for (const entry of stockEntries) {
      const key = `${entry.productId}_${entry.variantId}`;
      stockMap[key] = entry;
    }

    // 5️⃣ Fetch GLOBAL products and enrich with stock info
    const globalProducts = await Products.find({
      $or: [
        { "category._id": { $in: allCategoryIds } },
        { subCategoryId: { $in: allCategoryIds } },
        { subSubCategoryId: { $in: allCategoryIds } },
      ],
    })
      .skip(skip)
      .limit(limit)
      .lean();

    for (const product of globalProducts) {
      product.inventory = [];

      if (Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          const key = `${product._id}_${variant._id}`;
          const stockData = stockMap[key];

          const quantity = stockData?.quantity || 0;

          if (stockData?.price != null) {
            variant.sell_price = stockData.price;
          }
          if (stockData?.mrp != null) {
            variant.mrp = stockData.mrp;
          }

          product.inventory.push({
            variantId: variant._id,
            quantity,
          });
        }
      }
    }

    // 6️⃣ Fetch SELLER products (use their own stock field)
    const sellerProducts = await sellerProduct
      .find({
        sellerId: id,
      })
      .lean();

    const enrichedSellerProducts = sellerProducts.map((prod) => ({
      ...prod,
      inventory: [
        {
          variantId: null, // sellerProduct has no variants
          quantity: prod.stock || 0,
        },
      ],
    }));

    // 7️⃣ Combine results
    const allProducts = globalProducts;

    return res.status(200).json({
      store,
      sellerAddedProducts: enrichedSellerProducts,
      products: allProducts,
    });
  } catch (err) {
    console.error("Error in getSeller:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

const notifySeller = async (
  sellerDoc,
  title,
  body,
  clickAction = "/dashboard1"
) => {
  const tokens = [sellerDoc.fcmToken, sellerDoc.fcmTokenMobile].filter(Boolean);
  for (const token of tokens) {
    await sendNotification(token, title, body, (clickAction = "/dashboard1"));
  }
};

exports.acceptDeclineRequest = async (req, res) => {
  try {
    const { approval, id, productId, isImage, isLocation, description } =
      req.body;

    // ---------- PRODUCT APPROVAL ----------
    if (productId) {
      const updateFields = {
        sellerProductStatus: approval,
        brandApprovelDescription: description || "",
        ...(approval === "approved" && { status: true }),
      };

      const productApplication = await Products.findByIdAndUpdate(
        productId,
        updateFields,
        { new: true }
      );
      if (approval === "approved") {
        let storeStock = await Stock.findOne({
          storeId: productApplication.addedBy,
        });
        if (!Array.isArray(storeStock.stock)) {
          storeStock.stock = [];
        }
        for (const variant of productApplication.variants) {
          const exists = storeStock.stock.find(
            (s) =>
              s.productId.toString() === productApplication._id.toString() &&
              s.variantId.toString() === variant._id.toString()
          );

          if (!exists) {
            storeStock.stock.push({
              productId: productApplication._id,
              variantId: variant._id,
              quantity: 0,
              price: variant.sell_price || 0,
              mrp: variant.mrp || 0,
            });
          }
        }
        await storeStock.save();
      }

      const sellerDoc = await seller.findById(productApplication.sellerId);
      if (sellerDoc) {
        await notifySeller(
          sellerDoc,
          `Product ${approval}`,
          `Your product application has been ${approval}.`
        );
      }

      return res.status(200).json({
        message: `Product application ${approval}`,
        productApplication,
      });
    }

    // ---------- LOCATION UPDATE ----------
    if (isLocation) {
      const sellerDoc = await seller.findById(id);
      if (!sellerDoc)
        return res.status(404).json({ message: "Seller not found" });

      let updatedData;

      if (approval === "approved") {
        await seller.findByIdAndUpdate(id, {
          $set: {
            city: sellerDoc.pendingAddressUpdate.city,
            zone: sellerDoc.pendingAddressUpdate.zone,
            location: sellerDoc.pendingAddressUpdate.location,
          },
        });

        updatedData = await seller.findByIdAndUpdate(
          id,
          { $unset: { pendingAddressUpdate: "" } },
          { new: true }
        );

        await notifySeller(
          sellerDoc,
          `Location Update Approved`,
          `Your location update request has been approved.`
        );
      } else {
        updatedData = await seller.findByIdAndUpdate(
          id,
          { "pendingAddressUpdate.status": "rejected" },
          { new: true }
        );

        await notifySeller(
          sellerDoc,
          `Location Update Rejected`,
          `Your location update request has been rejected.`
        );
      }

      return res.status(200).json({
        success: true,
        type: "location",
        message: `Location update ${approval}`,
        data: updatedData,
      });
    }

    // ---------- IMAGE UPDATE ----------
    if (isImage) {
      const sellerDoc = await seller.findById(id);
      if (!sellerDoc)
        return res.status(404).json({ message: "Seller not found" });

      let updatedData;

      if (approval === "approved") {
        const pendingImages = sellerDoc.pendingAdvertisementImages?.image || [];

        await seller.findByIdAndUpdate(id, {
          $set: {
            advertisementImages: pendingImages.filter(
              (img) => img && img !== ""
            ),
          },
          $unset: { pendingAdvertisementImages: "" },
        });

        updatedData = await seller.findById(id); // Get latest version

        await notifySeller(
          sellerDoc,
          `Advertisement Images Approved`,
          `Your advertisement images update has been approved.`
        );
      } else {
        updatedData = await seller.findByIdAndUpdate(
          id,
          { "pendingAdvertisementImages.status": "rejected" },
          { new: true }
        );

        await notifySeller(
          sellerDoc,
          `Advertisement Images Rejected`,
          `Your advertisement images update has been rejected.`,
          "/Profile"
        );
      }

      return res.status(200).json({
        success: true,
        type: "image",
        message: `Image update ${approval}`,
        data: updatedData,
      });
    }

    // ---------- SELLER APPLICATION APPROVAL ----------
    const application = await seller.findByIdAndUpdate(
      id,
      { approveStatus: approval },
      { new: true }
    );

    const sellerDoc = await seller.findById(id);
    if (sellerDoc) {
      await notifySeller(
        sellerDoc,
        `Seller Application ${approval}`,
        `Your seller application has been ${approval}.`
      );
    }

    return res
      .status(200)
      .json({ message: `Seller application ${approval}`, application });
  } catch (error) {
    console.error("❌ Error in acceptDeclineRequest:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.verifyOtpSeller = async (req, res) => {
  try {
    const { email, otpEmail, PhoneNumber, otp, type, fcmToken, token } =
      req.body;

    if (!PhoneNumber && !email) {
      return res
        .status(400)
        .json({ message: "Mobile number or email is required" });
    }

    if (type === "login") {
      const sellerDoc = await seller.findOne({
        $or: [{ PhoneNumber }, { email }],
      });

      if (!sellerDoc) {
        return res.status(404).json({ message: "Seller not found" });
      }

      const otpRecord = await OtpModel.findOne({
        $or: [{ mobileNumber: PhoneNumber }, { email }],
        otp,
      });

      if (!otpRecord) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      if (token && typeof token === "string" && token.trim() !== "") {
        if (sellerDoc.fcmTokenMobile !== token) {
          sellerDoc.fcmTokenMobile = token;
          await sellerDoc.save();
        }
      }

      if (fcmToken && typeof fcmToken === "string" && fcmToken.trim() !== "") {
        if (sellerDoc.fcmToken !== fcmToken) {
          sellerDoc.fcmToken = fcmToken;
          await sellerDoc.save();
        }
      }

      const jwttoken = jwt.sign(
        { _id: sellerDoc._id },
        process.env.jwtSecretKey,
        {
          expiresIn: "1d",
        }
      );
      await OtpModel.deleteOne({ _id: otpRecord._id });

      return res.status(200).json({
        message: "Login successful",
        sellerId: sellerDoc._id,
        storeName: sellerDoc.storeName,
        token: jwttoken,
      });
    }
    // 1️⃣ Find OTP record
    const otpRecord = await OtpModel.findOne({
      $or: [
        { mobileNumber: PhoneNumber, otp },
        { email, otpEmail },
      ],
    });
    console.log(otpRecord);
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // 2️⃣ Find seller
    const sellerDoc = await seller.findOne({ PhoneNumber });
    if (!sellerDoc) {
      return res.status(404).json({ message: "Seller not found" });
    }

    // 3️⃣ Prepare updates
    const updates = {};

    // Verify mobile if provided
    if (PhoneNumber) {
      if (otp !== otpRecord.otp) {
        return res.status(400).json({ message: "Invalid mobile OTP" });
      }
      updates.phoneNumberVerified = true;
      otpRecord.otp = null; // clear mobile OTP but keep email OTP if present
    }

    // Verify email if provided
    if (email) {
      if (otpEmail !== otpRecord.otpEmail) {
        return res.status(400).json({ message: "Invalid email OTP" });
      }
      updates.emailVerified = true;
      otpRecord.otpEmail = null; // clear email OTP but keep mobile OTP if present
    }

    const isMobileVerified =
      updates.phoneNumberVerified === true ||
      sellerDoc.phoneNumberVerified === true;
    const isEmailVerified =
      updates.emailVerified === true || sellerDoc.emailVerified === true;

    if (isMobileVerified && isEmailVerified) {
      updates.approveStatus = "pending_admin_approval";
    }

    // 4️⃣ Update seller
    await seller.updateOne({ _id: sellerDoc._id }, { $set: updates });

    // 5️⃣ Update or delete OTP record
    if (!otpRecord.otp && !otpRecord.otpEmail) {
      await OtpModel.deleteOne({ _id: otpRecord._id }); // remove record if both verified
    } else {
      await otpRecord.save(); // keep partially verified OTP for second step
    }

    return res.status(200).json({
      message: "Verification successful",
      status: updates.approveStatus || sellerDoc.approveStatus,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.editSellerProfile = async (req, res) => {
  try {
    const {
      storeName,
      city,
      zone,
      Latitude,
      Longitude,
      ownerName,
      gstNumber,
      fsiNumber,
      PhoneNumber,
      email,
      invoicePrefix,
      password,
      bankDetails,
      openTime,
      status,
      closeTime,
      // {bankName, accountHolder, accountNumber, ifsc, branch}
    } = req.body;

    const sellerId = req.params.id;

    const updateFields = {};

    if (storeName) updateFields.storeName = storeName;
    if (ownerName) updateFields.ownerName = ownerName;
    if (email) updateFields.email = email;
    if (invoicePrefix) {
      // Check if the prefix is already used by another seller
      const existingPrefix = await seller.findOne({
        invoicePrefix,
        _id: { $ne: sellerId }, // exclude current seller
      });
      if (existingPrefix) {
        return res.status(400).json({
          success: false,
          message:
            "Invoice prefix already in use. Please choose a unique prefix.",
        });
      }
      updateFields.invoicePrefix = invoicePrefix;
    }

    if (req.files?.image?.[0]) {
      updateFields.image = `/${req.files.image?.[0].key}`;
    }
    if (req.files?.file?.[0]) {
      updateFields.sellerSignature = `/${req.files.file?.[0].key}`;
    }
    if (req.files?.MultipleImage?.length > 0) {
      updateFields.pendingAdvertisementImages = {
        image: req.files.MultipleImage.map((file) => `/${file.key}`),
        status: "pending",
      };
    }

    if (PhoneNumber) updateFields.PhoneNumber = PhoneNumber;
    if (gstNumber) updateFields.gstNumber = gstNumber;
    if (fsiNumber) updateFields.fsiNumber = fsiNumber;
    if (password) updateFields.password = password;
    if (openTime) updateFields.openTime = openTime;
    if (closeTime) updateFields.closeTime = closeTime;
    if (status !== undefined) updateFields.status = status;
    if (bankDetails) {
      // Parse bankDetails if it comes as JSON string (from form-data)
      let parsedBankDetails = bankDetails;
      if (typeof bankDetails === "string") {
        try {
          parsedBankDetails = JSON.parse(bankDetails);
        } catch (err) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid bankDetails format" });
        }
      }

      // Validate fields before saving
      const { bankName, accountHolder, accountNumber, ifsc, branch } =
        parsedBankDetails;
      updateFields.bankDetails = {
        ...(bankName && { bankName }),
        ...(accountHolder && { accountHolder }),
        ...(accountNumber && { accountNumber }),
        ...(ifsc && { ifsc }),
        ...(branch && { branch }),
      };
    }
    // Do not overwrite live city/zone/lat/lng -> store in pendingAddressUpdate
    if (city || zone || Latitude || Longitude) {
      // Fetch city object
      let cityObj = null;
      if (city) {
        const cityDoc = await ZoneData.findById(city);
        if (cityDoc) {
          cityObj = { _id: cityDoc._id, name: cityDoc.city };
        }
      }

      let zoneArray = [];
      if (zone) {
        const cityDoc = await ZoneData.findOne({ "zones._id": zone });
        if (cityDoc) {
          const zoneDoc = cityDoc.zones.find(
            (z) => String(z._id) === String(zone)
          );
          if (zoneDoc) {
            zoneArray.push({
              _id: zoneDoc._id,
              name: cityDoc.city,
              title: zoneDoc.zoneTitle,
              latitude: zoneDoc.latitude,
              longitude: zoneDoc.longitude,
              range: zoneDoc.range,
            });
          }
        }
      }

      updateFields.pendingAddressUpdate = {
        ...(cityObj && { city: cityObj }),
        ...(zoneArray.length > 0 && { zone: zoneArray }),
        ...(Latitude && { Latitude }),
        ...(Longitude && { Longitude }),
        requestedAt: new Date(),
        status: "pending",
      };
    }

    const updatedSeller = await seller.findByIdAndUpdate(
      sellerId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedSeller) {
      return res
        .status(404)
        .json({ success: false, message: "Seller not updated or not found" });
    }

    return res.status(200).json({
      success: true,
      message:
        "Seller profile updated successfully (pending address approval if changed)",
      seller: updatedSeller,
    });
  } catch (error) {
    console.error("editSellerProfile error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

exports.sellerWithdrawalRequest = async (req, res) => {
  try {
    const { storeId, amount } = req.body;
    const storeData = await seller.findById(storeId);
    if (!storeData)
      return res.status(204).json({ message: "Seller not found" });

    const settings = await SettingAdmin.findOne();
    const minWithdrawal = settings?.minWithdrawal || 0;
    if (amount < minWithdrawal) {
      return res
        .status(400)
        .json({ message: `Minimum withdrawal amount is ₹${minWithdrawal}` });
    }
    let request = await requestId(true);
    const pendingWithdrawals = await store_transaction.aggregate([
      { $match: { storeId: storeData._id, status: "Pending", type: "debit" } },
      { $group: { _id: null, totalPending: { $sum: "$amount" } } },
    ]);

    const totalPending = pendingWithdrawals[0]?.totalPending || 0;

    // Check if requested amount + pending exceeds wallet
    if (amount + totalPending > storeData.wallet) {
      return res.status(400).json({
        message: "Insufficient wallet balance considering pending withdrawals",
      });
    }

    // Check if a pending withdrawal already exists
    let withdrawal = await store_transaction.findOne({
      storeId: storeData._id,
      status: "Pending",
      type: "debit",
    });

    if (withdrawal) {
      // Update existing pending request
      withdrawal.amount += amount;
      withdrawal.description = `Withdrawal request of ₹${withdrawal.amount} by seller`;
      await withdrawal.save();
    } else {
      // Create new withdrawal request
      withdrawal = await store_transaction.create({
        requestId: request,
        storeId: storeData._id,
        amount,
        currentAmount: storeData.wallet,
        type: "debit",
        description: `Withdrawal request of ₹${amount} by seller`,
        status: "Pending",
      });
    }

    return res.status(200).json({
      message: "Withdrawal request submitted successfully",
      wallet: storeData.wallet,
      pendingWithdrawal: withdrawal,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.getAllStore = async (req, res) => {
  try {
    const stores = await seller.find().select("storeName _id city");

    // Return success response
    return res.status(200).json({
      success: true,
      count: stores.length,
      stores,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// https://api.fivlia.in/getSellerProducts?categories=683eeb6ff6f5264ba0295760%683ed131f6f5264ba0295759&subCategories=683ef865f6f5264ba0295774%683ed131f6f5264ba0295755&subsubCategories=683ef865f6f5264ba0295724%683ed131f6f5264ba0295715
