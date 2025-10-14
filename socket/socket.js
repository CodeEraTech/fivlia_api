const { driverSocketMap,sellerSocketMap } = require('../utils/driverSocketMap');
const {updateDriverStatus} = require('../controlers/driverControler')
module.exports = (io) => {
  io.on('connection', (socket) => {
   console.log('Driver connected:', socket.id);
    socket.on('updateDriverStatus', async (payload) => {
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          console.error('Failed to parse payload:', payload);
          return;
        }
      }
      const { driverId, status } = payload || {};
      const result = await updateDriverStatus(driverId, status);
      
        if (status === 'online') {
          driverSocketMap.set(driverId, socket); // set only if online
          console.log('🧠 driverSocketMap:', [...driverSocketMap.entries()]);

        } else {
          driverSocketMap.delete(driverId); // remove if offline
        }

      if (result.success) {
        io.emit('activeStatus', { message: "Driver status updated", driverId, status });
      } else {
        socket.emit('statusUpdateError', { message: result.message, error: result.error });
      }
    });

    socket.on("joinSeller", (payload) => {
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          console.error("Failed to parse payload:", payload);
          return;
        }
      }

      const { storeId } = payload || {};
      if (!storeId) return;

      sellerSocketMap.set(storeId, socket);
      console.log("🏪 Seller connected:", storeId);
      console.log("🧠 sellerSocketMap:", [...sellerSocketMap.keys()]);

      socket.emit("joinedSellerRoom", { message: "Seller joined successfully", storeId });
    });
   
socket.on('disconnect', async () => {
  for (const [driverId, s] of driverSocketMap.entries()) {
    if (s.id === socket.id) {
      driverSocketMap.delete(driverId);
      console.log(`❌ Driver ${driverId} disconnected`);
      
      // Optional: Mark driver offline in DB
    //   await updateDriverStatus(driverId, 'offline');

      // Optional: Notify others (admin panel / frontend sockets)
      io.emit('driverDisconnected', { driverId });

      break;
    }
  }
  for (const [storeId, s] of sellerSocketMap.entries()) {
        if (s.id === socket.id) {
          sellerSocketMap.delete(storeId);
          console.log(`❌ Seller ${storeId} disconnected`);
          io.emit("sellerDisconnected", { storeId });
          break;
        }
      }
});
  });
};

