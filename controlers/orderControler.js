const {Order,TempOrder} = require('../modals/order')
const Products = require('../modals/Product')
const {Cart} = require('../modals/cart')
const driver = require('../modals/driver')
const {SettingAdmin} = require('../modals/setting')
const Address = require('../modals/Address')
const stock = require('../modals/StoreStock')
const sendPushNotification = require('../firebase/pushnotification');
const Store = require('../modals/store');
const deliveryStatus = require('../modals/deliveryStatus')

const MAX_DISTANCE_METERS = 5000;

exports.placeOrder = async (req, res) => {
  try {
    const { cartIds, addressId, storeId,paymentMode} = req.body;

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

      return res.status(200).json({  message: "Order placed successfully",  order: newOrder,});

    } else {
      const tempOrder = await TempOrder.create({
        userId,
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
    if (!tempOrder) return res.status(404).json({ message: "Order not found" });

    // 2. If payment failed, delete temp order and return
    if (paymentStatus === false) {
      await TempOrder.findByIdAndDelete(tempOrderId);
      return res.status(200).json({ message: "Payment failed. Order cancelled." });
    }
    // 3. Create final order
    const finalOrder = await Order.create({
      items: tempOrder.items,
      addressId: tempOrder.addressId,
      userId: tempOrder.userId,
      paymentStatus: "Successful",
      cashOnDelivery: tempOrder.cashOnDelivery,
      totalPrice: tempOrder.totalPrice,
      deliveryCharges: tempOrder.deliveryCharges,
      platformFee: tempOrder.platformFee,
      gst: tempOrder.gst || null,
      storeId:tempOrder.storeId,
      transactionId, // Optional: store this for tracking
    });

    // 4. Update stock based on each item in the temp order
    for (const item of tempOrder.items) {
      await stock.updateOne(
        {
          storeId:tempOrder.storeId,
          "stock.productId": item.productId,
          "stock.varientId": item.varientId,
        },
        {
          $inc: { "stock.$.quantity": -item.quantity },
        }
      );
    }

    // 5. Delete temp order
    await TempOrder.findByIdAndDelete(tempOrderId);

    res.status(200).json({
      message: "Payment verified. Order placed successfully.",
      order: finalOrder,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { storeId } = req.query;
    const query = storeId ? { storeId } : {};

    const orders = await Order.find(query)
      .populate({
        path: 'addressId',
        select: 'fullName address house_No floor landmark city state pincode',
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


exports.getOrderDetails = async (req,res) => {
  try {
    const userId = req.user
    
   const userOrders = await Order.find({userId}).lean()
       console.log('userInOrder',userOrders.userId);
       console.log('userId',userId);
  const results = [];

    for (const order of userOrders) {
      // Fetch address
      const address = await Address.findById(order.addressId).lean();

      // Get product details for each item
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
            images: product?.images
          }
        };
      }));

      results.push({
        orderId: order._id,
        orderStatus: order.orderStatus,
        totalPrice: order.totalPrice,
        cashOnDelivery: order.cashOnDelivery,
        deliveryCharges: order.deliveryCharges,
        platformFee: order.platformFee,
        items: itemsWithDetails,
        address
      });
    }

    return res.status(200).json({
      message: "Orders fetched successfully",
      orders: results
    });

  } catch (error) {
    console.error('Get orders error:', error.message);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
}

exports.orderStatus=async (req,res) => {
  try {
   const{orderId}=req.params
  const {status}=req.body
  const update = await Order.findByIdAndUpdate(orderId,{orderStatus:status},{new:true}).populate("userId");

if (update.userId?.fcmToken) {
      console.log("FCM Token:", update.userId.fcmToken);
      const response = await sendPushNotification(
        update.userId.fcmToken,
        "Order Update",
        `Your order status is now "${status}"`,
        { orderId: update._id.toString() }
      );
      console.log("Push Notification Response:", response);
    } else {
      console.log("No FCM token found for this user.");
    }

console.log('Order Status Updated');

  return res.status(200).json({message:'Order Status Updated',update})
} catch (error) {
    console.error('Get orders error:', error.message);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
}

exports.deliveryStatus=async (req,res) => {
  try {
     const {statusTitle,status}=req.body

    const lastStatus = await deliveryStatus.findOne().sort({ statusCode: -1 });

    let nextStatusCode = '100'; // default first code
    if (lastStatus && !isNaN(parseInt(lastStatus.statusCode))) {
      nextStatusCode = (parseInt(lastStatus.statusCode) + 1).toString();
    }

     const newStatus = await deliveryStatus.create({statusCode:nextStatusCode,statusTitle,status})
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
     const newStatus = await deliveryStatus.findByIdAndUpdate(id,{statusCode,statusTitle,status})
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