const { driverSocketMap } = require("../../utils/driverSocketMap");
const Assign = require("../../modals/driverModals/assignments");
const { Order } = require("../../modals/order");
const admin = require("../../firebase/firebase");
const Store = require("../../modals/store");
const User = require("../../modals/User");
const assignedOrders = new Set();

const assignWithBroadcast = async (order, drivers) => {
  const orderId = order.orderId.toString();
  let orderAssigned = false;
  let respondedDrivers = new Set();
  const timeLimit = 10000;
  const orderStore = await Store.findOne({ _id: order.storeId }).lean();
  const orderUser = await User.findOne({ _id: order.userId }).lean();
  const broadcastOrder = () => {
    console.log(
      `📢 Broadcasting order ${orderId} to ${drivers.length} drivers...`
    );

    drivers.forEach((driver) => {
      const driverId = driver._id.toString();
      const socket = driverSocketMap.get(driverId);

      if (!socket) return;

      // Emit socket event
      socket.emit("newOrder", {
        order,
        driverId,
        timeLeft: timeLimit / 1000,
        storeLat: orderStore.Latitude,
        storeLng: orderStore.Longitude,
        userLat: orderUser.location.latitude,
        userLng: orderUser.location.longitude,
      });

      // Send push notification
      if (driver.fcmToken) {
        admin
          .messaging()
          .send({
            token: driver.fcmToken,
            notification: {
              title: "New Order Request",
              body: `Order ${orderId} is waiting for your response`,
            },
            android: {
              notification: {
                channelId: "custom_sound_channel",
                sound: "custom_sound",
              },
            },
            data: {
              orderId,
              timeLeft: (timeLimit / 1000).toString(),
              screen: "TodayOrderScreen",
            },
          })
          .catch((err) => console.error("Push error:", err));
      }

      // Listen for responses
      const handleAccept = async ({
        driverId: incomingDriverId,
        orderId: incomingOrderId,
      }) => {
        if (
          incomingOrderId !== orderId ||
          incomingDriverId !== driverId ||
          orderAssigned
        )
          return;

        // Lock the order assignment
        if (assignedOrders.has(orderId)) {
          // socket.emit("orderAlreadyAccepted", { orderId });
          socket.emit("newOrder", []);
          return;
        }

        assignedOrders.add(orderId);
        orderAssigned = true;

        console.log(`✅ Driver ${driverId} accepted order ${orderId}.`);

        // Update DB
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

        // Inform other drivers
        drivers.forEach((d) => {
          const otherSocket = driverSocketMap.get(d._id.toString());
          if (d._id.toString() !== driverId && otherSocket) {
            //otherSocket.emit("orderTaken", { orderId });
            otherSocket.emit("newOrder", []);
          }
        });

        cleanupAllListeners();
      };

      const handleReject = async ({
        driverId: incomingDriverId,
        orderId: incomingOrderId,
      }) => {
        if (
          incomingOrderId !== orderId ||
          incomingDriverId !== driverId ||
          orderAssigned
        )
          return;

        respondedDrivers.add(driverId);
        await Assign.create({ driverId, orderId, orderStatus: "Rejected" });
        console.log(`❌ Driver ${driverId} rejected order ${orderId}.`);
      };

      socket.once("acceptOrder", handleAccept);
      socket.once("rejectOrder", handleReject);

      // Cleanup function for each driver
      const cleanup = () => {
        socket.off("acceptOrder", handleAccept);
        socket.off("rejectOrder", handleReject);
      };

      // Store cleanup for later
      socket.__cleanupOrder = cleanup;
    });
  };

  const cleanupAllListeners = () => {
    drivers.forEach((driver) => {
      const socket = driverSocketMap.get(driver._id.toString());
      if (socket && typeof socket.__cleanupOrder === "function") {
        socket.__cleanupOrder();
        delete socket.__cleanupOrder;
      }
    });
  };

  // First broadcast
  broadcastOrder();

  // After timeout, check if order was accepted
  setTimeout(() => {
    if (!orderAssigned) {
      console.log(
        `⏱️ No driver accepted order ${orderId}. Retrying broadcast...`
      );
      cleanupAllListeners(); // remove old listeners
      assignWithBroadcast(order, drivers); // retry
    }
  }, timeLimit);
};

module.exports = assignWithBroadcast;
