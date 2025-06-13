const { reverseGeocode } = require('../config/google');
const Order = require('../modals/order')
const User = require('../modals/User')
const Store = require('../modals/store')
const Products = require('../modals/Product')
const ZoneData = require('../modals/cityZone')
const Cart = require('../modals/cart')
const sendPushNotification = require('../firebase/pushnotification');
const geolib = require('geolib');

const MAX_DISTANCE_METERS = 5000; // 5km radius

exports.placeOrder = async (req, res) => {
  try {
    const user = req.user; // comes from auth middleware

    const {
      paymentStatus,
      orderPlacedFrom,
      discount,
      notes,
      cashOnDelivery
    } = req.body;

    // 1. Fetch user and check location
    const userData = await User.findById(user).lean();
    if (!userData) return res.status(400).json({ message: 'Invalid user' });

    const userLocation = userData.location;
    if (!userLocation?.latitude || !userLocation?.longitude) {
      return res.status(400).json({ message: 'User location (lat/lng) required' });
    }

    // 2. Get cart items of user
    const cartData = await Cart.findOne({ user }).lean();
    if (!cartData || !cartData.items || cartData.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const items = cartData.items;

    // 3. Calculate totalAmount from cart
    let totalAmount = 0;
    for (const item of items) {
      if (!item.price || !item.quantity) {
        return res.status(400).json({ message: 'Cart item missing price or quantity' });
      }
      totalAmount += parseFloat(item.price) * item.quantity;
    }

    // 4. Calculate finalAmount
    const finalAmount = totalAmount - (discount || 0);

    // 5. Find nearby stores
    const allStores = await Store.find({ online_visible: true }).lean();
    const nearbyStores = allStores.filter(store => {
      if (!store.Latitude || !store.Longitude) return false;

      const distance = geolib.getDistance(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: store.Latitude, longitude: store.Longitude }
      );

      return distance <= MAX_DISTANCE_METERS;
    });

    // 6. Pick first matched store (no item validation here)
    const matchedStore = nearbyStores[0];
    if (!matchedStore) {
      return res.status(400).json({ message: 'No nearby store found' });
    }

    // 7. COD check via zoneData
    let codAllowed = false;
    const zoneData = await ZoneData.findOne({ city: matchedStore.city });
    if (zoneData?.zones?.length) {
      const matchedZone = zoneData.zones.find(z =>
        reverseGeocode.isPointWithinRadius(
          { latitude: userLocation.latitude, longitude: userLocation.longitude },
          { latitude: z.latitude, longitude: z.longitude },
          z.range // in meters
        )
      );
      if (matchedZone?.cashOnDelivery) {
        codAllowed = true;
      }
    }

    const finalCOD = codAllowed && cashOnDelivery;

    // 8. Place the order
    const newOrder = new Order({
      user,
      items,
      location: {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      },
      store: matchedStore._id,
      cashOnDelivery: finalCOD,
      paymentStatus: paymentStatus || 'Pending',
      orderPlacedFrom: orderPlacedFrom || 'Web',
      totalAmount,
      discount: discount || 0,
      finalAmount,
      notes
    });

    const savedOrder = await newOrder.save();

    // 9. Send push notification
    if (userData.fcmToken) {
      await sendPushNotification(
        userData.fcmToken,
        'Order Placed',
        `Your order has been placed successfully! Total: ₹${finalAmount}`,
        { orderId: savedOrder._id.toString() }
      );
    }

    return res.status(201).json({
      message: 'Order placed successfully',
      order: savedOrder,
      store: {
        _id: matchedStore._id,
        name: matchedStore.storeName
      }
    });

  } catch (error) {
    console.error('Error placing order:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};



exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name price image');

    return res.status(200).json(orders);
  } catch (error) {
    console.error('Get orders error:', error.message);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.orderStatus=async (req,res) => {
  try {
   const{id}=req.params
  const {orderStatus,paymentStatus}=req.body
  const update = await Order.findByIdAndUpdate(id,{orderStatus,paymentStatus}).populate('user');

    if (update?.user?.fcmToken) {
      console.log("FCM Token:", update.user.fcmToken);
      const response = await sendPushNotification(
        update.user.fcmToken,
        'Order Update',
        `Your order status is now "${orderStatus}"`,
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
