const mongoose = require("mongoose");
const { Order } = require("../modals/order");

exports.getSellerReport = async (req, res) => {
  try {
    const { categoryId, zone, city, fromDate, toDate } = req.query;

    const matchOrder = {
      orderStatus: "Delivered",
    };

    // 🔫 date range filter
    if (fromDate && toDate) {
      matchOrder.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    const matchStore = {};
    if (city) {
      matchStore["storeData.city._id"] = new mongoose.Types.ObjectId(city);
    }
    if (zone) {
      matchStore["storeData.zone._id"] = new mongoose.Types.ObjectId(zone);
    }

    const pipeline = [
      // delivered + date filter
      { $match: matchOrder },

      // store join
      {
        $lookup: {
          from: "stores",
          localField: "storeId",
          foreignField: "_id",
          as: "storeData",
        },
      },
      { $unwind: "$storeData" },

      // city / zone filter
      { $match: matchStore },

      // transactions
      {
        $lookup: {
          from: "admin_transactions",
          localField: "orderId",
          foreignField: "orderId",
          as: "txnData",
        },
      },

      // break items
      { $unwind: "$items" },

      // product join
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productData",
        },
      },
      { $unwind: "$productData" },
    ];

    // 🎯 category filter
    if (categoryId) {
      pipeline.push({
        $match: {
          "productData.category._id": new mongoose.Types.ObjectId(categoryId),
        },
      });
    }

    // regroup
    pipeline.push(
      {
        $group: {
          _id: "$_id",
          orderId: { $first: "$orderId" },
          orderStatus: { $first: "$orderStatus" },
          paymentStatus: { $first: "$paymentStatus" },
          createdAt: { $first: "$createdAt" },
          totalPrice: { $first: "$totalPrice" },

          sellerName: { $first: "$storeData.storeName" },
          city: { $first: "$storeData.city.name" },
          zone: { $first: "$storeData.zone.title" },

          commission: {
            $first: { $arrayElemAt: ["$txnData.amount", 0] },
          },

          items: {
            $push: {
              productId: "$items.productId",
              productName: "$items.name",
              image: "$items.image",
              quantity: "$items.quantity",
              price: "$items.price",
              gst: "$items.gst",

              // 💰 category straight from product
              category: {
                _id: { $arrayElemAt: ["$productData.category._id", 0] },
                name: { $arrayElemAt: ["$productData.category.name", 0] },
              },
            },
          },
        },
      },

      // latest first
      { $sort: { createdAt: -1 } }
    );

    const reports = await Order.aggregate(pipeline);

    const summaryPipeline = [
      { $match: matchOrder },

      { $unwind: "$items" },

      {
        $group: {
          _id: "$_id",

          // order totals
          totalPrice: { $first: "$totalPrice" },
          deliveryPayout: { $first: "$deliveryPayout" },

          // item total
          itemTotal: {
            $sum: {
              $multiply: ["$items.price", "$items.quantity"],
            },
          },

          // commission per item
          totalCommission: {
            $sum: {
              $multiply: [
                {
                  $divide: ["$items.commision", 100],
                },
                {
                  $multiply: ["$items.price", "$items.quantity"],
                },
              ],
            },
          },
        },
      },

      {
        $group: {
          _id: null,

          // 💰 revenue
          totalRevenue: { $sum: "$totalPrice" },

          // 🧑‍✈️ driver income
          driverPaid: { $sum: "$deliveryPayout" },

          // 🏪 seller wallet credit
          sellerPaid: {
            $sum: {
              $subtract: ["$itemTotal", "$totalCommission"],
            },
          },

          // 🏦 admin profit
          totalProfit: { $sum: "$totalCommission" },
        },
      },
    ];
    const summaryAgg = await Order.aggregate(summaryPipeline);

    return res
      .status(200)
      .json({
        data: reports,
        totalRevenue: summaryAgg[0]?.totalRevenue || 0,
        driverPaid: summaryAgg[0]?.driverPaid || 0,
        sellerPaid: summaryAgg[0]?.sellerPaid || 0,
        totalProfit: summaryAgg[0]?.totalProfit || 0,
      });
  } catch (error) {
    console.error("Error in getSellerReport:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
