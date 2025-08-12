const { driverSocketMap } = require('../../utils/driverSocketMap');
const Assign = require('../../modals/driverModals/assignments');
const {Order} = require('../../modals/order');
const admin = require('../../firebase/firebase');

const driver = require('../../modals/driver');
const assignWithSocketLoop = async (order, drivers) => {
  let index = 0;
  let orderAssigned = false; // shared flag

  const tryAssign = async () => {
    if (orderAssigned) return;

    if (index >= drivers.length) {
      console.log(`No driver accepted order ${order.orderId}. Retrying in 10 Seconds...`);
      setTimeout(() => {
      const autoAssignDriver = require('./AutoAssignDriver');
      autoAssignDriver(order._id);
      }, 10000);
      return;
    }

    const driver = drivers[index];
    const socket = driverSocketMap.get(driver._id.toString());

    if (!socket) {
      index++;
      return tryAssign();
    }

    const timeLimit = 50000;
    const totalSeconds = timeLimit / 1000;

    console.log(`Sending order ${order.orderId} to driver ${driver._id} (${driver.driverName})`);
    socket.emit('newOrder', { order, driverId: driver._id, timeLeft: totalSeconds });

    if (driver.fcmToken) {
      admin.messaging().send({
        token: driver.fcmToken,
        notification: {
          title: 'New Order Request',
          body: `Order ${order.orderId} is waiting for your response`
        },
        android: {
          notification: {
            channelId: "custom_sound_channel",
            sound: "custom_sound"
          }
        },
        data: {
          orderId: order.orderId.toString(),
          timeLeft: totalSeconds.toString(),
          screen: "TodayOrderScreen"
        }
      }).then(res => console.log('Push sent:', res))
        .catch(err => console.error('Push error:', err));
    } else {
      console.warn(`Driver ${driver._id} does not have an FCM token.`);
    }

    const timeout = setTimeout(() => {
      if (!orderAssigned) {
        console.log(`Driver ${driver._id} did not respond to order ${order.orderId} in time.`);
        cleanup();
        index++;
        tryAssign();
      }
    }, timeLimit);

    const cleanup = () => {
      socket.off('acceptOrder', handleAccept);
      socket.off('rejectOrder', handleReject);
      clearTimeout(timeout);
    };

    const handleAccept = async ({ driverId, orderId }) => {
      if (driverId === driver._id.toString() && orderId === order.orderId){
      console.log("✅ Driver and order match — proceeding with acceptance...");

    orderAssigned = true;

    cleanup();
        await Order.findOneAndUpdate(
          { orderId },
          {
            driver: {
              driverId,
              name: driver.driverName,
              mobileNumber: driver.address?.mobileNo
            },
            orderStatus: "Going to Pickup"
          }
        );
        await Assign.create({ driverId, orderId, orderStatus: 'Accepted' });

        console.log(`Order ${orderId} accepted by driver ${driverId}. Stopping loop.`);
      }
    };

    const handleReject = async ({ driverId, orderId }) => {
      if (driverId === driver._id.toString() && orderId === order.orderId) {
        cleanup();
        await Assign.create({ driverId, orderId, orderStatus: 'Rejected' });
 console.log(`Order ${orderId} Rejected by driver ${driverId}`);


        index++;
        tryAssign();
      }
    };

    socket.once('acceptOrder', handleAccept);
    socket.once('rejectOrder', handleReject);
  };

  tryAssign();
};


module.exports = assignWithSocketLoop;
