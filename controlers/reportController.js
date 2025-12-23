const mongoose = require("mongoose");
const Store = require("../modals/store");
const { Order } = require("../modals/order");

exports.getSellerReport = async (req, res) => {
  try {
    const { categoryId, zone, city } = req.query;

    const matchOrder = {
      orderStatus: "Delivered",
    };

    const matchStore = {};
    if (city) {
      matchStore["storeData.city._id"] = new mongoose.Types.ObjectId(city);
    }
    if (zone) {
      matchStore["storeData.zone._id"] = new mongoose.Types.ObjectId(zone);
    }

    const reports = await Order.aggregate([
      // 🔥 Delivered only
      { $match: matchOrder },

      // 🔗 Store join
      {
        $lookup: {
          from: "stores",
          localField: "storeId",
          foreignField: "_id",
          as: "storeData",
        },
      },
      { $unwind: "$storeData" },

      // 🎯 City / Zone filter
      { $match: matchStore },

      // 🔗 Transactions
      {
        $lookup: {
          from: "admin_transactions",
          localField: "orderId",
          foreignField: "orderId",
          as: "txnData",
        },
      },

      // 🎯 Category filter (items only)
      {
        $addFields: {
          items: categoryId
            ? {
                $filter: {
                  input: "$items",
                  as: "item",
                  cond: {
                    $eq: [
                      "$$item.categoryId",
                      new mongoose.Types.ObjectId(categoryId),
                    ],
                  },
                },
              }
            : "$items",
        },
      },

      // 🧾 Projection
      {
        $project: {
          _id: 0,
          orderId: 1,
          orderStatus: 1,
          paymentStatus: 1,
          createdAt: 1,
          totalPrice: 1,

          sellerName: "$storeData.storeName",
          city: "$storeData.city.name",
          zone: "$storeData.zone.title",

          commission: { $arrayElemAt: ["$txnData.amount", 0] },

          items: {
            $map: {
              input: "$items",
              as: "item",
              in: {
                productName: "$$item.name",
                image: "$$item.image",
                quantity: "$$item.quantity",
                price: "$$item.price",
                gst: "$$item.gst",
              },
            },
          },
        },
      },

      // ⏱ Latest first
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({ data: reports });
  } catch (error) {
    console.error("Error in getSellerReport:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};