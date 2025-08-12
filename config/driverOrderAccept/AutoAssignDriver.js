const {findAvailableDriversNearUser } = require('../google');
const assignWithSocketLoop  = require('./assignDriver');
const Address = require('../../modals/Address')
const Assign = require('../../modals/driverModals/assignments');
const {Order} = require('../../modals/order')
const driver = require('../../modals/driver')

const admin = require("../../firebase/firebase");

const db = admin.firestore();

const autoAssignDriver = async (orderId) => {
  try {
    const order = await Order.findById(orderId)
    const user = await Address.findById(order.addressId);
    const userLat = user.latitude;
    const userLng = user.longitude;
    const drivers = await driver.find({ activeStatus: 'online' });
    const busyAssignments = await Assign.find({ orderStatus: 'Accepted' }).select('driverId');
    const busyDriverIds = busyAssignments.map(a => String(a.driverId));

    const availableDrivers = [];

    for (let d of drivers) {
      if (busyDriverIds.includes(String(d._id))) continue;

      const driverDocRef = db.collection('updates').doc(String(d._id));
      const driverSnapshot = await driverDocRef.get();
      if (!driverSnapshot.exists) {
  console.log(`⚠️ No Firestore update data found for driver ID: ${d._id}`);
  continue; // skip this driver
}
      const driverData = driverSnapshot.data();
console.log('driverData',driverData)
      const driverLat = driverData.latitude;
      const driverLng = driverData.longitude;

      const distance = findAvailableDriversNearUser(userLat, userLng, driverLat, driverLng);
console.log('distance',distance)
      if (distance <= 5000) {
        availableDrivers.push({ driverz: d, distance });
      }
    }

    availableDrivers.sort((a, b) => a.distance - b.distance);

    assignWithSocketLoop(order, availableDrivers.map(d => d.driverz));

  } catch (err) {
    console.error(err);
  }
};

module.exports = autoAssignDriver