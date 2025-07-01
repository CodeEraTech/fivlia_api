const {Order,TempOrder} = require('../modals/order')
const Products = require('../modals/Product')
const {Cart} = require('../modals/cart')
const driver = require('../modals/driver')
const User = require('../modals/User')
const Status = require('../modals/deliveryStatus')
const {SettingAdmin} = require('../modals/setting')
const Address = require('../modals/Address')
const stock = require('../modals/StoreStock')
const sendNotification = require('../firebase/pushnotification');
const Store = require('../modals/store');
const deliveryStatus = require('../modals/deliveryStatus')

const MAX_DISTANCE_METERS = 5000;

exports.placeOrder = async (req, res) => {
  try {
    const { cartIds, addressId, storeId,paymentMode} = req.body;


 const lastOrder = await Order.findOne().sort({ createdAt: -1 }); // or {_id: -1}

let nextOrderId = 'OID001'; // Default if no previous order

if (lastOrder?.orderId?.startsWith('OID')) {
  const match = lastOrder.orderId.match(/OID(\d+)/);
  if (match) {
    const number = parseInt(match[1]) + 1;
    nextOrderId = `OID${number.toString().padStart(3, '0')}`; // Pads with 0s up to 3 digits
  }
}


    const chargesData = await SettingAdmin.findOne();
    const cartItems = await Cart.find({ _id: { $in: cartIds } });
    // console.log(chargesData);
    const itemsTotal = cartItems.reduce((sum, item) => {
      return sum + Number(item.price) * Number(item.quantity);
    }, 0);

    const totalPrice = itemsTotal + chargesData.Delivery_Charges + chargesData.Platform_Fee;

    const paymentOption = cartItems[0].paymentOption; // from zone

if (paymentMode === true && paymentOption === false) {
  return res.status(401).json({ message: "Cash On Delivery is not available in your zone" });
}

    const userId = cartItems[0].userId;
    const cashOnDelivery = paymentMode === true;

const orderItems = [];

for (const item of cartItems) {
  const product = await Products.findById(item.productId).lean();
  const gst = product.tax

  orderItems.push({
    productId: item.productId,
    varientId: item.varientId,
    name: item.name,
    quantity: item.quantity,
    price: Number(item.price),
    image: item.image,
    gst,
  });
}

    if (paymentMode === true) {

      const newOrder = await Order.create({
        orderId:nextOrderId,
        items: orderItems,
        addressId,
        paymentStatus:'Successful',
        cashOnDelivery,
        totalPrice,
        userId,
        storeId,
        deliveryCharges: chargesData.Delivery_Charges,
        platformFee: chargesData.Platform_Fee,
      });

      for (const item of cartItems) {
  await stock.updateOne(
    {
      storeId: storeId,
      "stock.productId": item.productId,
      "stock.varientId": item.varientId
    },
    {
      $inc: { "stock.$.quantity": -item.quantity }
    }
  );
 }


      await Cart.deleteMany({ _id: { $in: cartIds } });

      return res.status(200).json({ message: "Order placed successfully",  order: newOrder,});

    } else {
      const tempOrder = await TempOrder.create({
        userId,
        orderId:nextOrderId,
        items: orderItems,
        addressId,
        totalPrice,
        storeId,
        paymentStatus: "Pending",
        cashOnDelivery,
        deliveryCharges: chargesData.Delivery_Charges,
        platformFee: chargesData.Platform_Fee,
      });
   await Cart.deleteMany({ _id: { $in: cartIds } });
      return res.status(200).json({
        message: "Proceed to payment",
        tempOrderId: tempOrder._id,
        tempOrder,
      });
    }

  } catch (error) {
    console.error("Order error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { tempOrderId, paymentStatus, transactionId } = req.body;

    // 1. Check if temp order exists
    const tempOrder = await TempOrder.findById(tempOrderId);
    if (!tempOrder) return res.status(404).json({ message: "Temp order not found" });

    // 2. Prepare order data
    const orderData = {
      orderId: tempOrder.orderId,
      items: tempOrder.items,
      addressId: tempOrder.addressId,
      userId: tempOrder.userId,
      cashOnDelivery: tempOrder.cashOnDelivery,
      totalPrice: tempOrder.totalPrice,
      deliveryCharges: tempOrder.deliveryCharges,
      platformFee: tempOrder.platformFee,
      gst: tempOrder.gst || '',
      storeId: tempOrder.storeId,
      transactionId: transactionId || '',
      paymentStatus: paymentStatus ? "Successful" : "Cancelled",
      orderStatus: paymentStatus ? "Pending" : "Cancelled"
    };

    // 3. Create the final order
    const finalOrder = await Order.create(orderData);

    // 4. Update stock ONLY if payment was successful
    if (paymentStatus === true) {
      for (const item of tempOrder.items) {
        await stock.updateOne(
          {
            storeId: tempOrder.storeId,
            "stock.productId": item.productId,
            "stock.varientId": item.varientId,
          },
          {
            $inc: { "stock.$.quantity": -item.quantity },
          }
        );
      }
    }

    // 5. Delete the temp order
    await TempOrder.findByIdAndDelete(tempOrderId);

    // 6. Respond
    return res.status(200).json({
      status: paymentStatus ? true : false,
      message: paymentStatus
        ? "Payment verified. Order placed successfully."
        : "Payment failed or cancelled. Order saved with status Cancelled.",
      order: finalOrder,
    });

  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getOrders = async (req, res) => {
  try {
    const { storeId } = req.query;
    const query = storeId ? { storeId } : {};

    const orders = await Order.find(query)
      .populate({
        path: 'addressId',
        select: 'fullName address mobileNumber house_No floor landmark city state pincode',
      })
      .populate({
        path: 'storeId',
        select: 'storeName',
      })
      .sort({ createdAt: -1 })
      .lean();

    const ordersWithCity = await Promise.all(
      orders.map(async (order) => {
        // Extract city from address
        let city = 'Unknown';
        if (order.addressId?.city) city = order.addressId.city;

        // Format full address
        const formattedAddress = order.addressId
          ? {
              fullName: order.addressId.fullName || 'N/A',
              fullAddress: [
                order.addressId.address || '',
                order.addressId.house_No || '',
                order.addressId.floor ? `Floor ${order.addressId.floor}` : '',
                order.addressId.landmark || '',
                order.addressId.city || '',
                order.addressId.state || '',
                order.addressId.pincode || '',
              ]
                .filter(Boolean)
                .join(', ') || 'N/A',
              moibleNumber: order.addressId.mobileNumber || '',
            }
          : { fullName: 'N/A', fullAddress: 'N/A' };

        // Inject variant info inside items
        const itemsWithVariant = await Promise.all(
          order.items.map(async (item) => {
            const product = await Products.findById(item.productId).lean();
            const variant = product?.variants?.find(
              (v) => v._id.toString() === item.varientId?.toString()
            );

            return {
              ...item,
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
                _id: order.storeId._id || 'N/A',
                storeName: order.storeId.storeName || 'N/A',
              }
            : null,
          city,
        };
      })
    );

    return res.status(200).json({
      message: 'Orders retrieved successfully',
      orders: ordersWithCity,
    });
  } catch (error) {
    console.error('Get orders error:', error.message);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const userId = req.user;

    const userOrders = await Order.find({ userId }).lean();
    const results = [];

    for (const order of userOrders) {
      // 1. Fetch address
      const address = await Address.findById(order.addressId).lean();

      // 2. Fetch driver details if driverId exists
      let driverInfo = {};
      if (order.driver?.driverId) {
        driverInfo = await driver.findOne({ driverId: order.driver.driverId }).lean();

          driverInfo = {
            driverId: driverInfo.driverId || '',
            name: driverInfo.driverName || '',
            mobileNo: driverInfo.address?.mobileNo || '',
          };
      }

      // 3. Get product details for each item
      const itemsWithDetails = await Promise.all(order.items.map(async (item) => {
        const product = await Products.findById(item.productId).lean();
        return {
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
          gst: item.gst,
          varientId: item.varientId,
          productDetails: {
            title: product?.title,
            description: product?.description,
            brand: product?.brand,
            images: product?.images,
          }
        };
      }));

      // 4. Push combined data
      results.push({
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        totalPrice: order.totalPrice,
        cashOnDelivery: order.cashOnDelivery,
        deliveryCharges: order.deliveryCharges,
        platformFee: order.platformFee,
        transactionId:order.transactionId || '',
        items: itemsWithDetails,
        address,
        driver: driverInfo, // 🟢 Include driver data
      });
    }

    return res.status(200).json({
      message: "Orders fetched successfully",
      orders: results,
    });

  } catch (error) {
    console.error('Get orders error:', error.message);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.orderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, driverId } = req.body;

    const updateData = { orderStatus: status };

    if (driverId) {
      const driverDoc = await driver.findOne({ driverId });
      if (!driverDoc) return res.status(404).json({ message: "Driver not found" });

      updateData.driver = {
        driverId: driverDoc.driverId,
        name: driverDoc.driverName,
      };
    }

    // 1. Update order status
    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: "Order not found" });

    // 2. Get user & status info
    const user = await User.findById(updatedOrder.userId).lean();
    const statusInfo = await Status.findOne({ statusTitle: status });

    // 3. Send notification if FCM token valid and status exists
    if (
      user?.fcmToken &&
      user.fcmToken !== "null" &&
      statusInfo?.statusTitle
    ) {
      await sendNotification(
        user.fcmToken,
        `📦 Order #${updatedOrder.orderId} - ${statusInfo.statusTitle}`,
        `Your order is now marked as ${statusInfo.statusTitle}`,
        {
          image: statusInfo.image || "",
          orderId: updatedOrder.orderId,
          statusCode: statusInfo.statusCode,
        }
      );
    }

    // 4. Send response
    return res.status(200).json({ message: "Order Status Updated", update: updatedOrder });
  } catch (error) {
    console.error("Order status error:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.deliveryStatus=async (req,res) => {
  try {
     const {statusTitle,status}=req.body

    const lastStatus = await deliveryStatus.findOne().sort({ statusCode: -1 });

    let nextStatusCode = '100'; // default first code
    if (lastStatus && !isNaN(parseInt(lastStatus.statusCode))) {
      nextStatusCode = (parseInt(lastStatus.statusCode) + 1).toString();
    }
   const image = req.files.image?.[0].path
     const newStatus = await deliveryStatus.create({statusCode:nextStatusCode,statusTitle,status,image})
     return res.status(200).json({message:'New Status Created',newStatus})
  } catch (error) {
    console.error('Get orders error:', error.message);
    return res.status(500).json({ message: 'Server Error', error: error.message }); 
  }
}
exports.updatedeliveryStatus=async (req,res) => {
  try {
     const {id} = req.params
     const {statusCode,statusTitle,status}=req.body
      const image = req.files.image?.[0].path
     const newStatus = await deliveryStatus.findByIdAndUpdate(id,{statusCode,statusTitle,image,status})
     return res.status(200).json({message:'Status Updated',newStatus})
  } catch (error) {
    console.error('Get orders error:', error.message);
    return res.status(500).json({ message: 'Server Error', error: error.message }); 
  }
}

exports.getdeliveryStatus=async (req,res) => {
  try {
     const Status = await deliveryStatus.find()
     return res.status(200).json({message:'Delivery Status',Status})
  } catch (error) {
    console.error('Get orders error:', error.message);
    return res.status(500).json({ message: 'Server Error', error: error.message }); 
  }
}
// routes/testRoute.js or controller
exports.test = async (req, res) => {
  try {
  const token = 'd4HVM3utRw6dS3eK8J0qUN:APA91bEyK6IHXVqttY8xbhEqckbtvehYD4QaF6LaVzRTuC1Wk0fnCiMTaRNMsV0Sobm9WkDeD0rPnnuQ8SNhtdqO6YcLMvZL1hNBaX3r3Zl2tV8X9UGcOag';

  const response = await sendPushNotification(
    token,
    '🚀 Backend Test',
    'If you received this, backend FCM works!',
    { testMode: 'true' }
  );

  res.json({ message: 'Notification sent', response });
  } catch (error) {
    console.error(error);
   return res.status(500).json({ message: '❌ Failed to send notification', error: error.message}); 
  }
}

exports.driver = async (req, res) => {
  try {
  const {driverName,status}=req.body
  const image = req.files.image?.[0].path
  const address = JSON.parse(req.body.address);
  const totalDrivers = await driver.countDocuments();
const paddedNumber = String(totalDrivers + 1).padStart(3, "0");
const driverId = `FV${paddedNumber}`
const newDriver = await driver.create({driverId,driverName,status,image,address})
 return res.status(200).json({ message: 'Driver added successfully', newDriver}); 
} catch (error) {
   console.error(error);
   return res.status(500).json({ message: '❌ Failed to add driver', error: error.message}); 
  }
}

exports.getDriver = async (req,res) => {
  try {
    const Driver = await driver.find()
    return res.status(200).json({ message: 'Drivers', Driver}); 
  } catch (error) {
   console.error(error);
   return res.status(500).json({ message: 'Server error', error: error.message}); 
  }
}

exports.editDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { driverName, status } = req.body;

    let address = {};
    if (req.body.address) {
      try {
        address = JSON.parse(req.body.address);
      } catch (err) {
        return res.status(400).json({ message: "Invalid address JSON" });
      }
    }

    const image = req.files?.image?.[0]?.path;

    const updateData = {
      driverName,
      status,
      ...(image && { image }),
      ...(address && { address }),
    };

    const edit = await driver.findByIdAndUpdate(driverId, updateData, { new: true });

    return res.status(200).json({ message: "Driver Updated", edit });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
