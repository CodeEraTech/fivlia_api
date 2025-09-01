const seller = require('../../modals/store')
const {SettingAdmin} = require('../../modals/setting')
const {ZoneData} = require('../../modals/cityZone')
const sendVerificationEmail = require('../../config/nodeMailer'); 
const OtpModel = require("../../modals/otp")
const request = require('request');
const crypto = require('crypto')
const {otpTemplate} = require('../../utils/emailTemplates')
const Products = require('../../modals/Product');
const CategoryModel = require('../../modals/category');
const Stock = require('../../modals/StoreStock')
const sellerProduct = require('../../modals/sellerModals/sellerProduct');

exports.addSeller = async (req,res) => {
    try {
        const {storeName,firstName,lastName,PhoneNumber,email,city,zone,gstNumber} = req.body

        const sellerData = await seller.findOne({  $or: [{ email },{ PhoneNumber }] })
        if(sellerData){
          const Exist = sellerData.email === email ? "Email" : "Mobile number"; 
        return res.status(409).json({ message: `${Exist} already exist`});
        }

        const setting = await SettingAdmin.findOne()
        const authSettings = setting?.Auth?.[0] || {};
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpEmail = crypto.randomInt(100000, 999999).toString();
        const gstCertificate = `/${req.files?.gstCertificate?.[0]?.key}`
//     const rawImagePath = req.files?.image?.[0]?.key || "";
//     const image = rawImagePath ? `/${rawImagePath}` : ""; 
       const storeImages = req.files?.MultipleImage?.map(file => `/${file.key}`) || [];

       const zones = await ZoneData.find({"zones._id": { $in: zone }});
       const matchedZones = [];
zones.forEach(doc => {
  doc.zones.forEach(z => {
    if (zone.includes(z._id.toString())) {
      matchedZones.push({
        name: z.zoneTitle,
        range: z.range,
        lat: z.latitude,
        lng: z.longitude
      });
    }
  });
});

console.log(matchedZones)
        const newSeller = await seller.create({storeName,firstName,lastName,Authorized_Store:false,PhoneNumber,email,storeImages,city,zone:matchedZones,gstNumber,approveStatus: 'pending_verification'})
        
      var options = {
       method: 'POST',
        url: 'https://msggo.in/wapp/public/api/create-message',
        headers: {},
      formData: {
        'appkey': authSettings.whatsApp.appKey,
        'authkey': authSettings.whatsApp.authKey,
        'to': PhoneNumber,
        'message': `Welcome to Fivlia - Delivery in Minutes!\nYour OTP is ${otp}. Do not share it with anyone.\n\nThis OTP is valid for 30 minutes.`,
      }
    };

   request(options, async function (error, response) {
           if (error) {
             console.error(error);
             return res.status(500).json({ message: 'Failed to send OTP via WhatsApp' });
           }
             await OtpModel.create({email,otpEmail, mobileNumber:PhoneNumber, otp, expiresAt: Date.now() + 30 * 60 * 1000 });
   });
     await sendVerificationEmail(email,"Welcome to Fivlia – Your store is under verification",otpTemplate(otpEmail));

        return res.status(200).json({ message: 'OTP sent via WhatsApp And Email', otp });
    } catch (error) {
    console.error(error);
    return res.status(500).json({message: "An Error Occured"});
    }
}

exports.sendOtp = async (req,res) => {
    try{
 const {PhoneNumber} = req.body
 const otp = crypto.randomInt(100000, 999999).toString();
 const setting = await SettingAdmin.findOne()
 const authSettings = setting?.Auth?.[0] || {};
 var options = {
       method: 'POST',
        url: 'https://msggo.in/wapp/public/api/create-message',
        headers: {},
      formData: {
        'appkey': authSettings.whatsApp.appKey,
        'authkey': authSettings.whatsApp.authKey,
        'to': PhoneNumber,
        'message': `Welcome to Fivlia - Delivery in Minutes!\nYour OTP is ${otp}. Do not share it with anyone.\n\nThis OTP is valid for 30 minutes.`,
      }
    };

   request(options, async function (error, response) {
           if (error) {
             console.error(error);
             return res.status(500).json({ message: 'Failed to send OTP via WhatsApp' });
           }
             await OtpModel.create({ mobileNumber:PhoneNumber, otp, expiresAt: Date.now() + 30 * 60 * 1000 });
             return res.status(200).json({ message: 'OTP sent via WhatsApp', otp });
   });

    }catch(error){
    console.error(error);
    return res.status(500).json({ResponseMsg: "An Error Occured"});
    }
}

exports.getSellerRequest = async (req,res) => {
    try{
    const requests = await seller.find({status:"pending_admin_approval"})
    return res.status(200).json({message:"Seller Approval Requests",requests})
    }catch(error){
    console.error(error);
    return res.status(500).json({ResponseMsg: "An Error Occured"});
    }
}

exports.getSeller = async (req, res) => {
  try {
    const { id,page=1,limit } = req.query;
const skip = (page-1)*limit
    // 1️⃣ Return all approved sellers if no ID
    if (!id) {
      const sellers = await seller.find({ approveStatus: "approved" },{Authorized_Store:false}).lean();
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

      (category.subcat || []).forEach(sub => {
        allCategoryIds.push(sub._id.toString());
        (sub.subsubcat || []).forEach(subsub => {
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
        { subSubCategoryId: { $in: allCategoryIds } }
      ]
    }).skip(skip).limit(limit).lean();

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
            quantity
          });
        }
      }
    }

    // 6️⃣ Fetch SELLER products (use their own stock field)
    const sellerProducts = await sellerProduct.find({
      sellerId: id,
    }).lean();

    const enrichedSellerProducts = sellerProducts.map(prod => ({
      ...prod,
      inventory: [
        {
          variantId: null, // sellerProduct has no variants
          quantity: prod.stock || 0
        }
      ]
    }));

    // 7️⃣ Combine results
    const allProducts = globalProducts

    return res.status(200).json({
      store,
      sellerAddedProducts:enrichedSellerProducts,
      products: allProducts
    });

  } catch (err) {
    console.error("Error in getSeller:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.acceptDeclineRequest = async(req,res)=>{
    try{
     const {approval,id} = req.body
     const application = await seller.findByIdAndUpdate(id,{approveStatus:approval})

     return res.status(200).json({message:`Seller application ${approval}`,application})

    }catch(error){
        console.error(error);
        return res.status(500).json({message:"Server Error"})
    }
}

exports.verifyOtpSeller = async (req, res) => {
  try {
    const { email, otpEmail, PhoneNumber, otp,type } = req.body;

    if (!PhoneNumber && !email) {
      return res.status(400).json({ message: 'Mobile number or email is required' });
    }

    if (type === 'login') {
      const sellerDoc = await seller.findOne({
        $or: [
          { PhoneNumber },
          { email }
        ]
      });

      if (!sellerDoc) {
        return res.status(404).json({ message: 'Seller not found' });
      }

       const otpRecord = await OtpModel.findOne({
      $or: [{ mobileNumber:PhoneNumber }, { email }],otp
    });

     if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

     await OtpModel.deleteOne({ _id: otpRecord._id });

      return res.status(200).json({
        message: 'Login successful',
        sellerId: sellerDoc._id
      });
    }
    // 1️⃣ Find OTP record
    const otpRecord = await OtpModel.findOne({
      $or: [{ mobileNumber:PhoneNumber,otp }, { email,otpEmail }]
    });
    console.log(otpRecord)
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // 2️⃣ Find seller
    const sellerDoc = await seller.findOne({ PhoneNumber });
    if (!sellerDoc) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    // 3️⃣ Prepare updates
    const updates = {};

    // Verify mobile if provided
    if (PhoneNumber) {
      if (otp !== otpRecord.otp) {
        return res.status(400).json({ message: 'Invalid mobile OTP' });
      }
      updates.phoneNumberVerified = true;
      otpRecord.otp = null; // clear mobile OTP but keep email OTP if present
    }

    // Verify email if provided
    if (email) {
      if (otpEmail !== otpRecord.otpEmail) {
        return res.status(400).json({ message: 'Invalid email OTP' });
      }
      updates.emailVerified = true;
      otpRecord.otpEmail = null; // clear email OTP but keep mobile OTP if present
    }

    const isMobileVerified =
      updates.phoneNumberVerified === true || sellerDoc.phoneNumberVerified === true;
    const isEmailVerified =
      updates.emailVerified === true || sellerDoc.emailVerified === true;

    if (isMobileVerified && isEmailVerified) {
      updates.approveStatus = 'pending_admin_approval';
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
      message: 'Verification successful',
      status: updates.approveStatus || sellerDoc.approveStatus,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred", error: error.message });
  }
};

// https://api.fivlia.in/getSellerProducts?categories=683eeb6ff6f5264ba0295760%683ed131f6f5264ba0295759&subCategories=683ef865f6f5264ba0295774%683ed131f6f5264ba0295755&subsubCategories=683ef865f6f5264ba0295724%683ed131f6f5264ba0295715