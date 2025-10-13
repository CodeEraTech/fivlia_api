// controllers/adminController.js
const Store = require("../modals/store");
const mongoose = require('mongoose');
const {Order} = require("../modals/order");
const Category = require("../modals/category");
const Product = require("../modals/Product");
const User = require("../modals/User");
const Driver = require("../modals/driver");
const admin_transaction = require('../modals/adminTranaction')
const store_transaction = require('../modals/storeTransaction')
const Transaction = require('../modals/driverModals/transaction')
const Stock = require("../modals/StoreStock");

exports.getDashboardStats = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // Total Stores
    const totalStores = await Store.countDocuments();

    // Total Users
    const totalUsers = await User.countDocuments();

    // Total Drivers
    const totalDrivers = await Driver.countDocuments();

    // Total Categories
    const totalCategories = await Category.countDocuments();

    // Total Products
    const totalProducts = await Product.countDocuments();

    // Orders this month
    const monthlyOrders = await Order.find({
      createdAt: { $gte: startOfMonth, $lt: endOfMonth },
    });

    const totalOrdersMonthly = monthlyOrders.length;

    const completedOrdersMonthly = monthlyOrders.filter(
      (order) => order.orderStatus === "Delivered" || order.orderStatus === "Completed"
    ).length;

    const pendingOrdersMonthly = monthlyOrders.filter(
      (order) => order.orderStatus === "Pending" || order.orderStatus === "Processing"
    ).length;

    // Total Earning
    const adminWallet = await admin_transaction.findById('68ea20d2c05a14a96c12788d');
    const totalRevenue = adminWallet?.wallet || 0;

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId storeId")
      .lean();

    return res.status(200).json({
      totalStores,
      totalUsers,
      totalDrivers,
      totalCategories,
      totalProducts,
      totalOrdersMonthly,
      completedOrdersMonthly,
      pendingOrdersMonthly,
      totalRevenue,
      recentOrders,
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getStoreDashboardStats = async (req, res) => {
  try {
    const storeId = req.params.storeId
    if (!storeId) return res.status(400).json({ message: "Store ID required" });

     // Current Month Date Range
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    // Total Orders (Monthly)
    const totalMonthlyOrders = await Order.countDocuments({
      storeId:storeId,
      createdAt: { $gte: firstDay, $lte: lastDay },
    });

    // Completed Orders (Monthly)
    const completedMonthlyOrders = await Order.countDocuments({
      storeId: storeId,
      orderStatus: { $in: ["Delivered", "Completed"] },
      createdAt: { $gte: firstDay, $lte: lastDay },
    });

    // Pending Orders (Monthly)
    const pendingMonthlyOrders = await Order.countDocuments({
      storeId: storeId,
      orderStatus: { $in: ["Pending", "Processing", "Confirmed"] },
      createdAt: { $gte: firstDay, $lte: lastDay },
    });

    const store = await Store.findById(storeId).lean();
    if (!store) return res.status(404).json({ message: "Store not found" });

    const totalEarning = store.wallet || 0;

    const categoryIds = store.Category || [];

    const storeStatus = store.status

    let totalCategories = 0;
    let totalProducts = 0;

    if (store.Authorized_Store === true) {
      // ✅ Authorized Store: Use `Category` field
      const categoryIds = store.Category || [];
      totalCategories = categoryIds.length;

      totalProducts = await Product.countDocuments({
        "category._id": { $in: categoryIds },
      });
    } else {
      const sellerCats = store.sellerCategories || [];

      // count all categories
      totalCategories = sellerCats.length;

      // find products from stock
      const stockData = await Stock.findOne({ storeId }).lean();

      if (stockData?.stock?.length) {
        totalProducts = stockData.stock.length;
      } else {
        totalProducts = 0;
      }
    }

    // Recent Orders (20)
    const recentOrders = await Order.find({ storeId: storeId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("userId storeId")
      .lean();

    return res.status(200).json({
      totalEarning,
      totalMonthlyOrders,
      completedMonthlyOrders,
      pendingMonthlyOrders,
      totalCategories,
      totalProducts,
      storeStatus,
      recentOrders,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

exports.walletAdmin = async (req, res) => {
  try {
    const stores = await Store.find({}, { _id: 1, name: 1 });

    const orders = await Order.find({}, { storeId: 1, totalPrice: 1 });

    const adminWallet = await admin_transaction.findById('68ea20d2c05a14a96c12788d');
    const totalCash = adminWallet?.wallet || 0;

    const storeTotals = {};
    stores.forEach(store => {
      storeTotals[store._id.toString()] = 0;
    });

    orders.forEach(order => {
      const store = order.storeId?.toString();
      if (storeTotals[store] !== undefined) {
        storeTotals[store] += order.totalPrice || 0;
      }
    });

    res.status(200).json({
      message: "Wallet",
      totalCash,
      storeTotals
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      message: "Something went wrong",
      error: error.message
    });
  }
};

exports.adminTranaction = async (req,res)=>{
  try{
const Tranaction =await admin_transaction.find().sort({ createdAt: -1 })
return res.status(200).json({message:"Tranaction history",Tranaction})
  }
  catch(error){
    console.error("Dashboard error:", error);
    res.status(500).json({message: "Something went wrong", error: error.message});
  }
}

exports.getWithdrawalRequest = async (req, res) => {
  try {
    const { type } = req.query;

    if (type === "seller") {
      // Fetch all seller withdrawal requests
      const requests = await store_transaction
        .find({ type: "debit",status:"Pending" })
        .sort({ createdAt: -1 });

      // Enrich each request with seller details
      const enrichedRequests = await Promise.all(
        requests.map(async (reqItem) => {
          const storeData = await Store.findById(reqItem.storeId).select(
            "storeName ownerName PhoneNumber email city fullAddress gstNumber wallet bankDetails sellerSignature invoicePrefix openTime closeTime"
          );

          return {
            _id: reqItem._id,
            type: reqItem.type,
            amount: reqItem.amount,
            storeId: reqItem.storeId,
            description: reqItem.description,
            status: reqItem.status,
            createdAt: reqItem.createdAt,
            updatedAt: reqItem.updatedAt,
            sellerDetails: storeData
              ? {
                  storeName: storeData.storeName,
                  ownerName: storeData.ownerName,
                  phoneNumber: storeData.PhoneNumber,
                  email: storeData.email,
                  city: storeData.city,
                  fullAddress: storeData.fullAddress,
                  gstNumber: storeData.gstNumber,
                  wallet: storeData.wallet,
                  bankDetails: storeData.bankDetails,
                  sellerSignature: storeData.sellerSignature,
                  invoicePrefix: storeData.invoicePrefix,
                  openTime: storeData.openTime,
                  closeTime: storeData.closeTime,
                }
              : null,
          };
        })
      );

      return res.status(200).json({
        message: "Withdrawal requests",
        requests: enrichedRequests,
      });
    }

    // For non-seller type (general transaction withdrawal requests)
    const requests = await Transaction.find({ type: "debit" }).sort({
      createdAt: -1,
    });

    return res.status(200).json({ message: "Withdrawal requests", requests });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.withdrawal = async (req, res) => {
  try {
    const { id, action, type } = req.params;
    const { note, image } = req.body || {};

    if (type === "seller"){
    const request = await store_transaction.findOne({'storeId':id,type:"debit",status:"Pending"});
  
      const defaultNotes = {
        accept: "The withdrawal request has;y been accepted successfully.",
        decline: "The withdrawal request has been declined.",
      };
   
    request.status = action === "accept" ? "Accepted" : "Declined";
    request.Note = note || defaultNotes[action];
    if (req.files?.image?.[0]) request.image = `/${req.files.image?.[0].key}`;

    if (action === "accept") {

      request.lastAmount = request.currentAmount;

        // deduct withdrawal amount from currentAmount
        request.currentAmount = Math.max(0, request.currentAmount - request.amount);


      const store = await Store.findById(request.storeId);
      if (!store)
        return res.status(404).json({ message: "Store not found" });

      // Reduce wallet amount
      store.wallet = Math.max(0, store.wallet - request.amount);
      await store.save();
    }

    await request.save();

    return res.status(200).json({
      message: `Withdrawal request ${request.status.toLowerCase()} successfully`,
      request,
    });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};
