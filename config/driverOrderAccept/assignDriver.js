const { driverSocketMap } = require("../../utils/driverSocketMap");
const Assign = require("../../modals/driverModals/assignments");
const { Order } = require("../../modals/order");
const admin = require("../../firebase/firebase");
const activeDrivers = new Set();

const assignWithSocketLoop = async (order, drivers) => {
  let orderAssigned = false;
  let rejectedDrivers = []; // Track rejected drivers to retry with them
  let index = 0; // Track the current driver to try

  const tryAssign = async () => {
    if (orderAssigned) return; // Exit if order is already assigned

    if (index >= drivers.length) {
      console.log(`All drivers rejected order ${order.orderId}. Retrying with rejected drivers...`);
      if (rejectedDrivers.length === 0) {
        console.log("No drivers to retry with. Retrying in 10 seconds...");
        setTimeout(() => {
          const autoAssignDriver = require("./AutoAssignDriver");
          autoAssignDriver(order._id);
        }, 10000); // Retry assignment after 10 seconds if all drivers reject
      } else {
        rejectedDrivers.forEach((driver) => {
           activeDrivers.delete(driver._id.toString());
        });
        // Retry with the rejected drivers
        drivers = rejectedDrivers;
        rejectedDrivers = [];
        index = 0; // Reset index to start from the beginning of the rejected list
        tryAssign(); // Recursively call to retry with the rejected drivers
      }
      return;
    }

    const driver = drivers[index];
    if (activeDrivers.has(driver._id.toString())) {
      index++;
      return tryAssign(); // Skip active drivers and try the next
    } else {
      activeDrivers.add(driver._id.toString());
      setTimeout(() => {
        activeDrivers.delete(driver._id.toString()); // Remove from active drivers after 30 seconds
      }, 15000);
    }

    const socket = driverSocketMap.get(driver._id.toString());
    if (!socket) {
      index++;
      return tryAssign(); // Skip if socket not available
    }

    const timeLimit = 10000; // Timeout for 10 seconds
    const totalSeconds = timeLimit / 1000;

    // Send order to the driver via socket
    socket.emit('newOrder', { order, driverId: driver._id, timeLeft: totalSeconds });

    if (driver.fcmToken) {
      admin
        .messaging()
        .send({
          token: driver.fcmToken,
          notification: {
            title: "New Order Request",
            body: `Order ${order.orderId} is waiting for your response`,
          },
          android: {
            notification: {
              channelId: "custom_sound_channel",
              sound: "custom_sound",
            },
          },
          data: {
            orderId: order.orderId.toString(),
            timeLeft: totalSeconds.toString(),
            screen: "TodayOrderScreen",
          },
        })
        .then((res) => console.log("Push sent:", res))
        .catch((err) => console.error("Push error:", err));
    } else {
      console.warn(`Driver ${driver._id} does not have an FCM token.`);
    }

    const timeout = setTimeout(() => {
      if (!orderAssigned) {
        console.log(`Driver ${driver._id} did not respond to order ${order.orderId} in time.`);
        cleanup();
        rejectedDrivers.push(driver); // Mark as rejected driver
        index++;
        tryAssign(); // Move to next driver
      }
    }, timeLimit);

    const cleanup = () => {
      socket.off("acceptOrder", handleAccept);
      socket.off("rejectOrder", handleReject);
      clearTimeout(timeout);
    };

    const handleAccept = async ({ driverId, orderId }) => {
      if (driverId === driver._id.toString() && orderId === order.orderId) {
        console.log(`✅ Driver ${driverId} accepted order ${orderId}.`);
        orderAssigned = true;
        cleanup();
        await Order.findOneAndUpdate(
          { orderId },
          {
            driver: {
              driverId,
              name: driver.driverName,
              mobileNumber: driver.address?.mobileNo,
            },
            orderStatus: "Going to Pickup",
          }
        );
        await Assign.updateOne(
          { driverId, orderId },
          { $set: { orderStatus: "Accepted" } },
          { upsert: true }
        );
        console.log(`Order ${orderId} accepted by driver ${driverId}.`);
      }
    };

    const handleReject = async ({ driverId, orderId }) => {
      if (driverId === driver._id.toString() && orderId === order.orderId) {
        console.log(`Driver ${driverId} rejected order ${orderId}`);
        cleanup();
        await Assign.create({ driverId, orderId, orderStatus: 'Rejected' });
        rejectedDrivers.push(driver); // Mark as rejected driver
        index++;
        tryAssign(); // Move to next driver
      }
    };

    socket.once("acceptOrder", handleAccept);
    socket.once("rejectOrder", handleReject);
  };

  tryAssign();
};

module.exports = assignWithSocketLoop;