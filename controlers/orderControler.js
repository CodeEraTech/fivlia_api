// controllers/orderController.js
const Order = require('../modals/order');
const {ZoneData} = require('../modals/cityZone');   
exports.placeOrder = async (req, res) => {
  try {
    const {
      user,
      items,
      address,
      paymentStatus,
      orderType,
      orderPlacedFrom,
      totalAmount,
      discount,
      finalAmount,
      notes
    } = req.body;
   const userData = await User.findById(user).populate('zone');

    if (!userData || !userData.address || !userData.city) {
      return res.status(400).json({ message: 'User address or city not found' });
    }


    const city = address.city;

const zoneDoc = await ZoneData.findOne({city});
if (!zoneDoc) {
  return res.status(400).json({ message: 'City not found in the database' });
}
    const zone = zoneDoc.zones.find(z =>z._id.toString()  === address.zone);
    console.log('Zones in DB:', zoneDoc.zones);
    console.log('address.zone',address.zone);
    
    if (!zone) {
      return res.status(400).json({ message: 'Invalid zone provided' });
    }

    const codAllowed = zone.cashOnDelivery === true;

    // If user tries to select COD but not allowed, reject
    if (req.body.cashOnDelivery && !codAllowed) {
      return res.status(400).json({ message: 'Cash on delivery not available in your zone' });
    }

    const newOrder = new Order({
      user,
      items,
      address,
      cashOnDelivery: codAllowed && req.body.cashOnDelivery ? true : false,
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
