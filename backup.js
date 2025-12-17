const { deliverOrderCommon } = require("../services/deliverOrder.service");

if (orderStatus === "Delivered") {
  try {
    const result = await deliverOrderCommon({
      orderId,
      otp,
      validateOtp: true,
      deliveredBy: "Driver",
    });

    if (result.alreadyDelivered) {
      return res.status(200).json({ message: "Order already delivered" });
    }

    return res.status(200).json({
      message: "Order Delivered Successfully",
      statusUpdate: result.updatedOrder,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}
