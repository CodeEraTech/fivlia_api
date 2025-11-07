const mongoose = require("mongoose");
const Store = require("../modals/store");
const { Order } = require("../modals/order");

exports.getSellerReport = async (req, res) => {
  try {
    const reports = await Order.aggregate([
      // Filter only delivered orders
      {
        $match: {
          orderStatus: "Delivered",
        },
      },
      // Join store collection
      {
        $lookup: {
          from: "stores",
          localField: "storeId",
          foreignField: "_id",
          as: "storeData",
        },
      },
      {
        $unwind: {
          path: "$storeData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Join admin_transactions collection
      {
        $lookup: {
          from: "admin_transactions",
          localField: "orderId",
          foreignField: "orderId",
          as: "txnData",
        },
      },

      // Project fields
      {
        $project: {
          _id: 0,
          orderId: 1,
          orderStatus: 1,
          paymentStatus: 1,
          createdAt: 1,
          totalPrice: 1,

          sellerName: "$storeData.storeName",
          city: { $ifNull: ["$storeData.city.name", "-"] },
          zone: {
            $ifNull: [{ $arrayElemAt: ["$storeData.zone.title", 0] }, "-"],
          },

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

      // Sort latest orders first
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res.status(200).json({
      data: reports,
    });
  } catch (error) {
    console.error("Error in getSellerReport:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
