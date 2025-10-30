const { Order, TempOrder } = require("../modals/order");
const Products = require("../modals/Product");
const { Cart } = require("../modals/cart");
const autoAssignDriver = require("../config/driverOrderAccept/AutoAssignDriver");
const driver = require("../modals/driver");
const User = require("../modals/User");
const Status = require("../modals/deliveryStatus");
const { SettingAdmin } = require("../modals/setting");
const Address = require("../modals/Address");
const BulkOrderRequest = require("../modals/bulkOrderRequest");
const stock = require("../modals/StoreStock");
const admin_transaction = require("../modals/adminTranaction");
const store_transaction = require("../modals/storeTransaction");
const Notification = require("../modals/Notification");
const Assign = require("../modals/driverModals/assignments");
const sendNotification = require("../firebase/pushnotification");
const Store = require("../modals/store");
const { getStoresWithinRadius } = require("../config/google");
const { sellerSocketMap,adminSocketMap } = require("../utils/driverSocketMap");
const {
  generateAndSendThermalInvoice,
  generateStoreInvoiceId,
} = require("../config/invoice");
const deliveryStatus = require("../modals/deliveryStatus");
const {
  getNextOrderId,
  FeeInvoiceId,
  getNextDriverId,
} = require("../config/counter");
const {
  createRazorpayOrder,
  getCommison,
} = require("../utils/razorpayService");

const MAX_DISTANCE_METERS = 5000;
const MAX_ATTEMPTS = 10; // retry 10 times (for example, every 30s = 5 minutes total)
const RETRY_INTERVAL = 5000;

// Helper: send repeated notifications until accepted
const repeatNotifyStore = async (orderId, storeDoc, attempt = 1) => {
  try {
    const order = await Order.findOne({ orderId });
    if (!order) return console.log(`⚠️ Order ${orderId} not found`);

    // If store already accepted, stop retrying
    if (order.orderStatus === "Accepted") {
      console.log(`✅ Store accepted order ${orderId}, stopping retries`);
      return;
    }

    // Otherwise, send notification again
    await notifySeller(
      storeDoc,
      `⏰ Reminder: New Order #${order.orderId} still pending`,
      `You have a pending order worth ₹${order.totalPrice}. Please accept or reject it.`
    );

    console.log(`🔁 Reminder sent to store ${storeDoc._id} for order ${orderId} (attempt ${attempt})`);

    // Schedule next retry if not accepted yet
    if (attempt < MAX_ATTEMPTS) {
      setTimeout(() => repeatNotifyStore(orderId, storeDoc, attempt + 1), RETRY_INTERVAL);
    } else {
      console.log(`🚫 Max retries reached for order ${orderId}`);
    }

  } catch (err) {
    console.error(`Error in repeatNotifyStore:`, err);
  }
};

const notifySeller = async (
  sellerDoc,
  title,
  body,
  clickAction = "/dashboard1",
  data = {}
) => {
  const tokens = [sellerDoc.fcmToken, sellerDoc.fcmTokenMobile].filter(Boolean);
  for (const token of tokens) {
    try {
      await sendNotification(token, title, body, clickAction, data);
    } catch (err) {
      console.error(
        "notifySeller: sendNotification failed for token",
        token,
        err?.message || err
      );
    }
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const { cartIds, addressId, storeId, paymentMode } = req.body;

    let nextOrderId = await getNextOrderId(false);

    const chargesData = await SettingAdmin.findOne();

    let deliveryChargeRaw = chargesData.Delivery_Charges || 0;
    let deliveryGstPercent = chargesData.Delivery_Charges_Gst || 0;
    let totalDeliveryCharge =
      deliveryChargeRaw / (1 + deliveryGstPercent / 100);

    const cartItems = await Cart.find({ _id: { $in: cartIds } });
    // console.log(chargesData);
    if (!cartItems) {
      return res
        .status(400)
        .json({ message: `Cart item with ID ${cartIds} not found.` });
    }

    const itemsTotal = cartItems.reduce((sum, item) => {
      return sum + Number(item.price) * Number(item.quantity);
    }, 0);
    const platformFeeRate = (chargesData.Platform_Fee || 0) / 100;
    const platformFeeAmount = itemsTotal * platformFeeRate;

    let totalPrice = itemsTotal;
    if (itemsTotal >= chargesData.freeDeliveryLimit) {
      totalPrice = itemsTotal + platformFeeAmount;
      deliveryChargeRaw = 0;
    } else {
      totalPrice = itemsTotal + deliveryChargeRaw + platformFeeAmount;
    }

    // const paymentOption = cartItems[0].paymentOption;

    // if (paymentMode === true && paymentOption !== true) {
    //   return res
    //     .status(401)
    //     .json({ message: "Cash On Delivery is not available in your zone" });
    // }

    const address = await Address.findById(addressId);

    const userLat = address.latitude;
    const userLng = address.longitude;

    const { matchedStores } = await getStoresWithinRadius(userLat, userLng);

    const storeExistsInZone = matchedStores.some(
      (store) => store._id.toString() === storeId.toString()
    );

    if (!storeExistsInZone) {
      return res.status(400).json({
        message: "This store does not deliver to your address location.",
      });
    }

    const userId = cartItems[0].userId;
    const cashOnDelivery = paymentMode === true;

    const orderItems = [];

    for (const item of cartItems) {
      const product = await Products.findById(item.productId);
      if (!product) {
        console.error(`Product not found: ${item.productId}`);
        return res.status(400).json({
          message: `Product not found for ID: ${item.productId}`,
        });
      }
      const gst = product.tax;

      const commision = await getCommison(product._id);

      orderItems.push({
        productId: item.productId,
        varientId: item.varientId,
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
        commision,
        image: item.image,
        gst,
      });
    }

    if (paymentMode === true) {
      let nextOrderId = await getNextOrderId(true);
      const newOrder = await Order.create({
        orderId: nextOrderId,
        items: orderItems,
        addressId,
        paymentStatus: "Successful",
        cashOnDelivery,
        totalPrice,
        userId,
        storeId,
        deliveryPayout: totalDeliveryCharge,
        deliveryCharges: deliveryChargeRaw,
        platformFee: chargesData.Platform_Fee,
      });

      for (const item of cartItems) {
        const dataStock = await stock.updateOne(
          {
            storeId: storeId,
            "stock.productId": item.productId,
            "stock.variantId": item.varientId,
          },
          {
            $inc: { "stock.$.quantity": -item.quantity },
          }
        );
        // console.log("dataStock", dataStock);
        await Products.updateOne(
          { _id: item.productId },
          { $inc: { purchases: item.quantity } }
        );
        await Cart.deleteMany({ _id: { $in: cartIds } });
      }
      const sellerDoc = await Store.findById(storeId);

      if (sellerDoc) {
        await notifySeller(
          sellerDoc,
          `New Order #${newOrder.orderId} Received`,
          `You’ve received a new order worth ₹${newOrder.totalPrice}. Please confirm and prepare for dispatch.`
        );
   
        repeatNotifyStore(newOrder.orderId, sellerDoc);

  const sellerSocket = sellerSocketMap.get(sellerDoc._id.toString());
  if (sellerSocket) sellerSocket.emit("storeOrder", { orderId: newOrder.orderId });

  // ✅ Emit to admin as well
  const adminSocket = adminSocketMap.get("admin");
  if (adminSocket) {
    adminSocket.emit("storeOrder", {
      orderId: newOrder.orderId,
      storeId: sellerDoc._id,
      totalPrice: newOrder.totalPrice,
    });
    console.log(`👑 Sent new order to admin`);
  }
}



      return res
        .status(200)
        .json({ message: "Order placed successfully", order: newOrder });
    } else {
      const tempOrder = await TempOrder.create({
        userId,
        orderId: nextOrderId,
        items: orderItems,
        addressId,
        totalPrice,
        storeId,
        paymentStatus: "Pending",
        cashOnDelivery,
        cartIds,
        deliveryPayout: totalDeliveryCharge,
        deliveryCharges: deliveryChargeRaw,
        platformFee: chargesData.Platform_Fee,
      });
      const payResponse = await createRazorpayOrder(
        totalPrice,
        "INR",
        `receipt_${tempOrder._id}`,
        { orderId: nextOrderId }
      );
      return res.status(200).json({
        message: "Proceed to payment",
        tempOrderId: tempOrder._id,
        tempOrder,
        payResponse,
      });
    }
  } catch (error) {
    console.error("Order error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { tempOrderId, paymentStatus, transactionId } = req.body;

    // 1. Check if temp order exists
    const tempOrder = await TempOrder.findById(tempOrderId);
    if (!tempOrder)
      return res.status(404).json({ message: "Temp order not found" });

    if (paymentStatus === false) {
      // ❌ Payment failed -> just delete temp order and return
      await TempOrder.findByIdAndDelete(tempOrderId);

      return res.status(200).json({
        status: false,
        message:
          "Payment failed or cancelled. Order saved with status Cancelled.",
      });
    }

    const nextOrderId = await getNextOrderId(true);
    const orderData = {
      orderId: nextOrderId,
      items: tempOrder.items,
      addressId: tempOrder.addressId,
      userId: tempOrder.userId,
      cashOnDelivery: tempOrder.cashOnDelivery,
      totalPrice: tempOrder.totalPrice,
      deliveryCharges: tempOrder.deliveryCharges,
      platformFee: tempOrder.platformFee,
      gst: tempOrder.gst || "",
      deliveryPayout: tempOrder.deliveryPayout,
      storeId: tempOrder.storeId,
      transactionId: transactionId || "",
      paymentStatus: "Successful",
      orderStatus: "Pending",
    };

    const finalOrder = await Order.create(orderData);

    for (const item of tempOrder.items) {
      await stock.updateOne(
        {
          storeId: tempOrder.storeId,
          "stock.productId": item.productId,
          "stock.variantId": item.varientId,
        },
        {
          $inc: { "stock.$.quantity": -item.quantity },
        }
      );
      await Products.updateOne(
        { _id: item.productId },
        { $inc: { purchases: item.quantity } }
      );
    }

    await Cart.deleteMany({ _id: { $in: tempOrder.cartIds } });
    // 5. Delete the temp order
    await TempOrder.findByIdAndDelete(tempOrderId);

    const sellerDoc = await Store.findById(tempOrder.storeId);

    if (sellerDoc) {
      await notifySeller(
        sellerDoc,
        `New Order #${finalOrder.orderId} Received`,
        `You’ve received a new order worth ₹${finalOrder.totalPrice}. Please confirm and prepare for dispatch.`
      );
  const sellerSocket = sellerSocketMap.get(sellerDoc._id.toString());
  if (sellerSocket) sellerSocket.emit("storeOrder", { orderId: finalOrder.orderId });

  // ✅ Emit to admin as well
  const adminSocket = adminSocketMap.get("admin");
  if (adminSocket) {
    adminSocket.emit("storeOrder", {
      orderId: finalOrder.orderId,
      storeId: sellerDoc._id,
      totalPrice: finalOrder.totalPrice,
    });
    console.log(`👑 Sent new order to admin`);
  }
}

    return res.status(200).json({
      status: paymentStatus ? true : false,
      message: "Payment verified. Order placed successfully.",
      order: finalOrder,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { limit, page = 1, storeId } = req.query;
    const skip = (page - 1) * limit;
    const query = storeId ? { storeId } : {};

    const totalOrders = await Order.countDocuments();
    const orders = await Order.find(query)
      .populate({
        path: "addressId",
        select:
          "fullName address mobileNumber house_No floor landmark city state pincode",
      })
      .populate({
        path: "storeId",
        select: "storeName",
      })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .lean();

    const ordersWithCity = await Promise.all(
      orders.map(async (order) => {
        // Extract city from address
        let city = "Unknown";
        if (order.addressId?.city) city = order.addressId.city;

        // Format full address
        const formattedAddress = order.addressId
          ? {
              fullName: order.addressId.fullName || "N/A",
              fullAddress:
                [
                  order.addressId.address || "",
                  order.addressId.house_No || "",
                  order.addressId.floor ? `Floor ${order.addressId.floor}` : "",
                  order.addressId.landmark || "",
                  order.addressId.city || "",
                  order.addressId.state || "",
                  order.addressId.pincode || "",
                ]
                  .filter(Boolean)
                  .join(", ") || "N/A",
              moibleNumber: order.addressId.mobileNumber || "",
            }
          : { fullName: "N/A", fullAddress: "N/A" };

        // Inject variant info inside items
        const itemsWithVariant = await Promise.all(
          order.items.map(async (item) => {
            const product = await Products.findById(item.productId).lean();

            if (!product) {
              console.warn(`⚠️ Product not found for ID: ${item.productId}`);
              return {
                ...item,
                product: null,
                variantName: null,
                variantPrice: null,
              };
            }

            const variant = product?.variants?.find(
              (v) => v._id.toString() === item.varientId?.toString()
            );
            return {
              ...item,
              sku: product.sku || null,
              variantName: variant?.variantValue || null,
              variantPrice: variant?.sell_price || null,
            };
          })
        );

        return {
          ...order,
          items: itemsWithVariant,
          addressId: formattedAddress,
          storeId: order.storeId
            ? {
                _id: order.storeId._id || "N/A",
                storeName: order.storeId.storeName || "N/A",
              }
            : null,
          city,
        };
      })
    );
    const count = totalOrders;
    return res.status(200).json({
      message: "Orders retrieved successfully",
      orders: ordersWithCity,
      page,
      totalPages: Math.ceil(totalOrders / limit),
      count,
      limit,
    });
  } catch (error) {
    console.error("Get orders error:", error.message);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const userId = req.user;

    const userOrders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    const results = [];

    const settings = await SettingAdmin.findOne();

    for (const order of userOrders) {
      // 1. Fetch address
      const address = await Address.findById(order.addressId).lean();

      // 2. Fetch driver details if driverId exists
      let driverInfo = {};
      if (order.driver && order.driver.driverId) {
        driverInfo = await driver
          .findOne({ _id: order.driver.driverId })
          .lean();

        driverInfo = {
          driverId: driverInfo.driverId || "",
          Id: driverInfo._id || "",
          name: driverInfo.driverName || "",
          mobileNo: driverInfo.address?.mobileNo || "",
        };
      }
      let storeLocation = null;
      if (order.storeId) {
        const storeData = await Store.findById(order.storeId, {
          Latitude: 1,
          Longitude: 1,
        }).lean();

        if (storeData) {
          storeLocation =
            storeData.location || {
              Latitude: storeData.Latitude || null,
              Longitude: storeData.Longitude || null,
            };
        }
      }


      if (settings && order.totalPrice > settings.freeDeliveryLimit) {
        order.deliveryCharges = 0;
      }

      const itemsWithDetails = await Promise.all(
        order.items.map(async (item) => {
          const product = await Products.findById(item.productId).lean();
          return {
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
            gst: item.gst,
            storeId: order.storeId,
            productId: item.productId,
            varientId: item.varientId,
            productDetails: {
              title: product?.title,
              description: product?.description,
              brand: product?.brand,
              images: product?.images,
            },
          };
        })
      );
      // 4. Push combined data
      results.push({
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        totalPrice: order.totalPrice,
        cashOnDelivery: order.cashOnDelivery,
        deliveryCharges: order.deliveryCharges,
        platformFee: order.platformFee,
        transactionId: order.transactionId || "",
        items: itemsWithDetails,
        address,
        driver: driverInfo,
        storeLocation,
        createdAt: order.createdAt,
      });
    }

    return res.status(200).json({
      message: "Orders fetched successfully",
      orders: results,
    });
  } catch (error) {
    console.error("Get orders error:", error.message);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

exports.orderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, driverId } = req.body;

    const updateData = { orderStatus: status };

    if (driverId) {
      const driverDoc = await driver.findOne({ _id: driverId });
      if (!driverDoc)
        return res.status(404).json({ message: "Driver not found" });

      updateData.driver = {
        driverId: driverDoc._id,
        name: driverDoc.driverName,
        mobileNumber: driverDoc.address?.mobileNo || "",
      };

      // ✅ Fetch the order before update to get user & store info for notification
      const orderDoc = await Order.findById(id).lean();
      if (orderDoc) {
        const user = await User.findById(orderDoc.userId).lean();
        const storeData = await Store.findById(orderDoc.storeId).lean();

        // 🧠 Notify user that a driver has been assigned
        if (user?.fcmToken && user.fcmToken !== "null") {
          await sendNotification(
            user.fcmToken,
            "🚗 Driver Assigned!",
            `Your order #${orderDoc.orderId} has been assigned to driver ${driverDoc.driverName}.`,
            "/dashboard1",
            {
              orderId: orderDoc.orderId,
              driverName: driverDoc.driverName,
              driverMobile: driverDoc.address?.mobileNo || "",
              storeName: storeData?.storeName || "Fivlia",
            },
            "default"
          );
        }

        // 🧠 Optionally notify the store as well
        if (storeData?.fcmTokenMobile) {
          await sendNotification(
            storeData.fcmTokenMobile,
            "Driver Assigned 🚗",
            `Driver ${driverDoc.driverName} has been assigned for order #${orderDoc.orderId}.`,
            "/dashboard1",
            {
              orderId: orderDoc.orderId,
              driverName: driverDoc.driverName,
            },
            "default"
          );
        }
      }
    }

    // 1. Update order status
    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedOrder)
      return res.status(404).json({ message: "Order not found" });
    if (status === "Accepted") {
      autoAssignDriver(updatedOrder).catch((err) => {
        console.error("Driver assignment failed:", err.message);
      });
    }

    if (status === "Delivered" && updatedOrder.driver?.driverId) {
      if (updatedOrder.deliverStatus) {
        console.log(
          `Order ${updatedOrder.orderId} already processed for delivery.`
        );
      } else {
        console.log(
          `Processing delivery logic for order ${updatedOrder.orderId}...`
        );
        await Assign.findOneAndDelete({
          driverId: updatedOrder.driver.driverId,
          orderId: updatedOrder.orderId,
          orderStatus: "Accepted",
        });

        // 🧮 Commission + Wallet Update Logic (SAME AS driverOrderStatus)
        const storeBefore = await Store.findById(updatedOrder.storeId).lean();
        const store = storeBefore;

        // 🧮 Calculate Commission from Items
        const totalCommission = updatedOrder.items.reduce((sum, item) => {
          const itemTotal = item.price * item.quantity;
          const commissionAmount = ((item.commision || 0) / 100) * itemTotal;
          return sum + commissionAmount;
        }, 0);

        // 🏦 Credit Store Wallet
        let creditToStore = updatedOrder.totalPrice;
        if (!store.Authorized_Store) {
          creditToStore = updatedOrder.totalPrice - totalCommission;
        }

        const storeData = await Store.findByIdAndUpdate(
          updatedOrder.storeId,
          { $inc: { wallet: creditToStore } },
          { new: true }
        );

        // ➕ Create Store Transaction
        await store_transaction.create({
          currentAmount: storeData.wallet,
          lastAmount: storeBefore.wallet,
          type: "Credit",
          amount: creditToStore,
          orderId: updatedOrder.orderId,
          storeId: updatedOrder.storeId,
          description: store.Authorized_Store
            ? "Full amount credited (Authorized Store)"
            : `Credited after commission cut (${totalCommission.toFixed(
                2
              )} deducted)`,
        });

        // 🏛️ Credit Admin Wallet (only if commission exists)
        if (!store.Authorized_Store && totalCommission > 0) {
          const lastAmount = await admin_transaction
            .findById("68ea20d2c05a14a96c12788d")
            .lean();
          const updatedWallet = await admin_transaction.findByIdAndUpdate(
            "68ea20d2c05a14a96c12788d",
            { $inc: { wallet: totalCommission } },
            { new: true }
          );

          await admin_transaction.create({
            currentAmount: updatedWallet.wallet,
            lastAmount: lastAmount.wallet,
            type: "Credit",
            amount: totalCommission,
            orderId: updatedOrder.orderId,
            description: "Commission credited to Admin wallet",
          });
        }

        let storeInvoiceId;
        let feeInvoiceId;
        // 🧾 Generate Store Invoice ID
        if (store.Authorized_Store) {
          // Authorized store: use global counter for both invoices
          storeInvoiceId = await FeeInvoiceId(true); // increments counter
          feeInvoiceId = await FeeInvoiceId(true); // increments counter again
        } else {
          // Unauthorized store: local logic
          storeInvoiceId = await generateStoreInvoiceId(updatedOrder.storeId);
          feeInvoiceId = await FeeInvoiceId(true); // can still increment global counter
        }

        await Order.findByIdAndUpdate(updatedOrder._id, {
          storeInvoiceId,
          feeInvoiceId,
          deliverStatus: true,
        });

        if (store?.fcmTokenMobile) {
          await sendNotification(
            store.fcmTokenMobile,
            "Order Delivered 🎉",
            `Driver delivered order #${updatedOrder.orderId}.`,
            "/dashboard1",
            { orderId: updatedOrder.orderId },
            "default"
          );
        }

        try {
          await generateAndSendThermalInvoice(updatedOrder.orderId);
        } catch (err) {
          console.error("Error generating thermal invoice:", err);
        }
      }
    }
    const user = await User.findById(updatedOrder.userId).lean();
    const statusInfo = await Status.findOne({ statusTitle: status });

    const store = await Store.findById(updatedOrder.storeId).lean();
    // 3. Send notification if FCM token valid and status exists
    if (user?.fcmToken && user.fcmToken !== "null" && statusInfo?.statusTitle) {
      await sendNotification(
        user.fcmToken,
        `📦 Order #${updatedOrder.orderId} - ${statusInfo.statusTitle}`,
        `Your order is now marked as ${statusInfo.statusTitle} by ${
          store.storeName || "Fivlia"
        }`,
        "/dashboard1",
        {
          image: statusInfo.image || "",
          orderId: updatedOrder.orderId,
          statusCode: statusInfo.statusCode,
        },
        "default"
      );
    }

    return res
      .status(200)
      .json({ message: "Order Status Updated", update: updatedOrder });
  } catch (error) {
    console.error("Order status error:", error.message);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

exports.deliveryStatus = async (req, res) => {
  try {
    const { statusTitle, status } = req.body;

    const lastStatus = await deliveryStatus.findOne().sort({ statusCode: -1 });

    let nextStatusCode = "100"; // default first code
    if (lastStatus && !isNaN(parseInt(lastStatus.statusCode))) {
      nextStatusCode = (parseInt(lastStatus.statusCode) + 1).toString();
    }
    const rawImagePath = req.files?.image?.[0]?.key || "";
    const image = rawImagePath ? `/${rawImagePath}` : "";
    const newStatus = await deliveryStatus.create({
      statusCode: nextStatusCode,
      statusTitle,
      status,
      image,
    });
    return res.status(200).json({ message: "New Status Created", newStatus });
  } catch (error) {
    console.error("Get orders error:", error.message);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};
exports.updatedeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { statusCode, statusTitle, status } = req.body;
    const rawImagePath = req.files?.image?.[0]?.key || "";
    const image = rawImagePath ? `/${rawImagePath}` : "";
    const newStatus = await deliveryStatus.findByIdAndUpdate(id, {
      statusCode,
      statusTitle,
      image,
      status,
    });
    return res.status(200).json({ message: "Status Updated", newStatus });
  } catch (error) {
    console.error("Get orders error:", error.message);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

exports.getdeliveryStatus = async (req, res) => {
  try {
    const Status = await deliveryStatus.find();
    return res.status(200).json({ message: "Delivery Status", Status });
  } catch (error) {
    console.error("Get orders error:", error.message);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};
// routes/testRoute.js or controller
exports.test = async (req, res) => {
  try {
    const token =
      "d4HVM3utRw6dS3eK8J0qUN:APA91bEyK6IHXVqttY8xbhEqckbtvehYD4QaF6LaVzRTuC1Wk0fnCiMTaRNMsV0Sobm9WkDeD0rPnnuQ8SNhtdqO6YcLMvZL1hNBaX3r3Zl2tV8X9UGcOag";

    const response = await sendPushNotification(
      token,
      "🚀 Backend Test",
      "If you received this, backend FCM works!",
      { testMode: "true" }
    );

    res.json({ message: "Notification sent", response });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "❌ Failed to send notification",
      error: error.message,
    });
  }
};

exports.driver = async (req, res) => {
  try {
    const { driverName, status, email, approveStatus, password } = req.body;
    let nextDriverId = await getNextDriverId(true);
    const rawImagePath = req.files?.image?.[0]?.key || "";
    const image = rawImagePath ? `/${rawImagePath}` : "";
    const policeKey = req.files?.Police_Verification_Copy?.[0]?.key;
    const Police_Verification_Copy = policeKey ? `/${policeKey}` : "";
    const aadharFrontKey = req.files?.aadharCard?.[0]?.key;
    const aadharBackKey = req.files?.aadharCard?.[1]?.key;

    const dlFrontKey = req.files?.drivingLicence?.[0]?.key;
    const dlBackKey = req.files?.drivingLicence?.[1]?.key;

    const address = JSON.parse(req.body.address);
    const totalDrivers = await driver.countDocuments();
    const driverId = nextDriverId;
    const newDriver = await driver.create({
      driverId,
      driverName,
      status,
      image,
      address,
      email,
      password,
      approveStatus,
      Police_Verification_Copy,
      aadharCard: {
        front: aadharFrontKey ? `/${aadharFrontKey}` : "",
        back: aadharBackKey ? `/${aadharBackKey}` : "",
      },
      drivingLicence: {
        front: dlFrontKey ? `/${dlFrontKey}` : "",
        back: dlBackKey ? `/${dlBackKey}` : "",
      },
    });
    return res
      .status(200)
      .json({ message: "Driver added successfully", newDriver });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "❌ Failed to add driver", error: error.message });
  }
};

exports.getDriver = async (req, res) => {
  try {
    const Driver = await driver.find({approveStatus:{$ne:"pending_admin_approval"}});
    return res.status(200).json({ message: "Drivers", Driver });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.editDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { driverName, status, email, password } = req.body;

    let address = {};
    if (req.body.address) {
      try {
        address = JSON.parse(req.body.address);
      } catch (err) {
        return res.status(400).json({ message: "Invalid address JSON" });
      }
    }
    const rawImagePath = req.files?.image?.[0]?.key || "";
    const image = rawImagePath ? `/${rawImagePath}` : "";
    const policeKey = req.files?.Police_Verification_Copy?.[0]?.key;
    const Police_Verification_Copy = policeKey ? `/${policeKey}` : "";
    const aadharFrontKey = req.files?.aadharCard?.[0]?.key;
    const aadharBackKey = req.files?.aadharCard?.[1]?.key;

    const dlFrontKey = req.files?.drivingLicence?.[0]?.key;
    const dlBackKey = req.files?.drivingLicence?.[1]?.key;

    const updateData = {
      ...(driverName && { driverName }),
      status,
      ...(email && { email }),
      ...(password && { password }),
      ...(image && { image }),
      ...(Police_Verification_Copy && {
        Police_Verification_Copy,
      }),
      ...(aadharFrontKey &&
        aadharBackKey && {
          aadharCard: {
            front: aadharFrontKey ? `/${aadharFrontKey}` : "",
            back: aadharBackKey ? `/${aadharBackKey}` : "",
          },
        }),
      ...(dlFrontKey &&
        dlBackKey && {
          drivingLicence: {
            front: dlFrontKey ? `/${dlFrontKey}` : "",
            back: dlBackKey ? `/${dlBackKey}` : "",
          },
        }),
      ...(req.body.address ? { address: JSON.parse(req.body.address) } : {}),
    };

    const edit = await driver.findByIdAndUpdate(driverId, updateData, {
      new: true,
    });

    return res.status(200).json({ message: "Driver Updated", edit });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.getNotification = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    return res.status(200).json({ message: "✅ Notifications", notifications });
  } catch (error) {
    console.error("❌ Get Notification Error:", error);
    return res
      .status(500)
      .json({ message: "❌ Failed to fetch notifications" });
  }
};

exports.notification = async (req, res) => {
  try {
    const { title, description, city } = req.body;
    const rawImagePath = req.files?.image?.[0]?.key || "";
    const image = rawImagePath ? `/${rawImagePath}` : "";
    // console.log(image);
    const newNotification = await Notification.create({
      title,
      description,
      image,
      city,
    });

    return res.status(200).json({
      message: "✅ Notification created successfully",
      notification: newNotification,
    });
  } catch (error) {
    console.error("❌ Notification error:", error.message);
    return res.status(500).json({
      message: "❌ Failed to create notification",
      error: error.message,
    });
  }
};

exports.editNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, city } = req.body;
    const rawImagePath = req.files?.image?.[0]?.key || "";
    const updateData = { title, description, city };

    if (rawImagePath) {
      updateData.image = `/${rawImagePath}`;
    }
    const newNotification = await Notification.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return res.status(200).json({
      message: "✅ Notification updated successfully",
      notification: newNotification,
    });
  } catch (error) {
    console.error("❌ Notification error:", error.message);
    return res.status(500).json({
      message: "❌ Failed to create notification",
      error: error.message,
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteNotification = await Notification.findByIdAndDelete(id);
    return res.status(200).json({ message: "✅ Notification deleted" });
  } catch (error) {
    console.error("❌ Notification error:", error.message);
    return res.status(500).json({
      message: "❌ Failed to create notification",
      error: error.message,
    });
  }
};

exports.bulkOrder = async (req, res) => {
  try{
    const {productId} = req.params
    const userId = req.user

    await BulkOrderRequest.create({productId,userId})
    return res.status(200).json({message:"Request Submited"})
  }catch(error){
    console.error('error', error)
    return res.status(500).json({message: "Something went wrong", error: error.message})}
}

exports.getBulkOrders = async (req, res) => {
  try {
    // ✅ Fetch all bulk orders and populate user + product info
    const orders = await BulkOrderRequest.find()
      .populate({
        path: "userId",
        select: "name email mobileNumber", // choose what to show
      })
      .populate({
        path: "productId",
        select: "productName productThumbnailUrl sell_price variants slug", // choose what to show
      })
      .sort({ createdAt: -1 }) // latest first
      .lean();

    if (!orders.length) {
      return res.status(200).json({
        message: "No bulk orders found",
        orders: [],
      });
    }

    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      status: order.status,
      createdAt: order.createdAt,
      user: order.userId
        ? {
            id: order.userId._id,
            name: order.userId.name || "",
            email: order.userId.email || "",
            mobileNumber: order.userId.mobileNumber,
          }
        : null,
      product: order.productId
        ? {
            id: order.productId._id,
            title: order.productId.productName,
            slug: order.productId.slug || "",
            image: order.productId.productThumbnailUrl || "",
            price:order.productId.sell_price ||(Array.isArray(order.productId.variants) && order.productId.variants.length > 0
    ? order.productId.variants[0].sell_price: "") || order.productId.sell_price || "",
          }
        : null,
    }));

    return res.status(200).json({
      message: "Bulk orders fetched successfully",
      count: formattedOrders.length,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("❌ getBulkOrders error:", error);
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};
