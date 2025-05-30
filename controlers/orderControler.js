// controllers/orderController.js
const Order = require('../modals/order');
const {ZoneData} = require('../modals/cityZone');
const User = require('../modals/User') 
exports.placeOrder = async (req, res) => {
  try {
    const {
      user,
      items,
      addressId,
      paymentStatus,
      orderType,
      orderPlacedFrom,
      totalAmount,
      discount,
      finalAmount,
      notes,
      cashOnDelivery
    } = req.body;

    // 1. Fetch user and get addresses
    const userData = await User.findById(user).lean();
    if (!userData || !userData.Address || userData.Address.length === 0) {
      return res.status(400).json({ message: 'User has no saved address' });
    }

    const selectedAddress = userData.Address.find(addr => addr._id.toString() === addressId);
    if (!selectedAddress) {
      return res.status(400).json({ message: 'Selected address not found in user profile' });
    }

    const city = selectedAddress.city;

    let codAllowed = false;

    if (selectedAddress.zone) {
      const zoneDoc = await ZoneData.findOne({ city });
      if (zoneDoc) {
        const zone = zoneDoc.zones.find(z => z._id.toString() === selectedAddress.zone.toString());
        if (zone && zone.cashOnDelivery === true) {
          codAllowed = true;
        }
      }
    }

    const finalCOD = codAllowed && cashOnDelivery ? true : false;

    const newOrder = new Order({
      user,
      items,
      address: {
        fullName: selectedAddress.fullName,
        mobile: selectedAddress.mobileNumber,
        street: selectedAddress.address,
        city: selectedAddress.city,
        pincode: selectedAddress.pincode,
        zone: selectedAddress.zone, 
        landmark: selectedAddress.locality,
        type: selectedAddress.addressType
      },
      cashOnDelivery: finalCOD,
      paymentStatus: paymentStatus || 'Pending',
      orderType: orderType || 'Delivery',
      orderPlacedFrom: orderPlacedFrom || 'Web',
      totalAmount,
      discount: discount || 0,
      finalAmount,
      notes,
    });

    const savedOrder = await newOrder.save();

    return res.status(201).json({ message: 'Order placed successfully', order: savedOrder });
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
