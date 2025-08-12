// controllers/adminController.js
const Store = require("../modals/store");
const mongoose = require('mongoose');
const {Order} = require("../modals/order");
const Category = require("../modals/category");
const Product = require("../modals/Product");
const User = require("../modals/User");
const Driver = require("../modals/driver");

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
    const totalEarning = await Order.aggregate([
      { $match: { orderStatus: { $in: ["Delivered", "Completed"] },createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      }, }},
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    const totalRevenue = totalEarning[0]?.total || 0;

    // Recent Orders
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
    const totalEarningResult = await Order.aggregate([
      {
        $match: {
          storeId:  new mongoose.Types.ObjectId(storeId),
          orderStatus: { $in: ["Delivered", "Completed"] },
          createdAt: { $gte: firstDay, $lte: lastDay },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);
    const totalEarning = totalEarningResult[0]?.total || 0;

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

    const categoryIds = store.Category || [];

    const totalCategories = categoryIds.length;

    const totalProducts = await Product.countDocuments({
    "category._id": { $in: categoryIds },
    });


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

    const totalCash = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);

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
