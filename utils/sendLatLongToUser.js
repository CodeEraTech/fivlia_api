const admin = require('../firebase/firebase');
const db = admin.firestore(); // Your Firestore instance
const {Order} = require('../modals/order')
const { userSocketMap } = require('../utils/driverSocketMap');
async function sendDriverLocationToUser(driverId, orderId) {
  console.log("fucntion started ->")
  const driverDocRef = db.collection('updates').doc(String(driverId));
  const driverSnap = await driverDocRef.get();
  if (!driverSnap.exists) return;

  const driverLocation = driverSnap.data(); // { lat: ..., lng: ... }
console.log("GETED driver locs->",driverLocation)
  // Get the user who placed this order
  const order = await Order.findOne({ orderId }).lean();
  if (!order) return;
 
  const userSocket = userSocketMap.get(order.userId.toString());
  if (userSocket) {
    userSocket.emit('driverLocationUpdate', {
      orderId,
      driverId,
      location: driverLocation,
    });
  }
}

module.exports = sendDriverLocationToUser