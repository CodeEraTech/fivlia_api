const { Order } = require("../modals/order");
const { userSocketMap } = require("./driverSocketMap");

async function emitUserOrderStatusUpdate(orderInput, source = "unknown") {
  try {
    let orderData = null;

    if (
      orderInput &&
      typeof orderInput === "object" &&
      orderInput.userId &&
      orderInput.orderId
    ) {
      orderData = orderInput.toObject ? orderInput.toObject() : orderInput;
    } else if (orderInput && typeof orderInput === "object" && orderInput._id) {
      orderData = await Order.findById(orderInput._id).lean();
    } else if (
      typeof orderInput === "string" ||
      typeof orderInput === "number"
    ) {
      orderData = await Order.findOne({ orderId: orderInput }).lean();
    }

    if (!orderData || !orderData.userId) return false;

    const userId =
      orderData.userId && typeof orderData.userId === "object"
        ? String(orderData.userId._id || orderData.userId)
        : String(orderData.userId);

    const userSocket = userSocketMap.get(userId);
    if (!userSocket) return false;

    userSocket.emit("userOrderStatusUpdate", {
      message: "Order status updated",
      source,
      orderId: orderData.orderId,
      orderStatus: orderData.orderStatus,
      order: orderData, // full order payload for user app
      updatedAt: orderData.updatedAt || new Date(),
    });

    return true;
  } catch (error) {
    console.error("emitUserOrderStatusUpdate error:", error.message || error);
    return false;
  }
}

module.exports = { emitUserOrderStatusUpdate };
