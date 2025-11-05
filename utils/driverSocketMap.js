const driverSocketMap = new Map(); // driverId => socket
const sellerSocketMap = new Map();
const adminSocketMap = new Map();   
const userSocketMap = new Map();

const getDynamicRetryCount = (cancelMinutes, TIMEOUT_MS = 10000) => {
  const totalMs = cancelMinutes * 60 * 1000;
  const MAX_RETRY_COUNT = Math.ceil(totalMs / TIMEOUT_MS);
  return { TIMEOUT_MS, MAX_RETRY_COUNT };
};
module.exports = {
  driverSocketMap,
  sellerSocketMap,
  adminSocketMap,
  userSocketMap,
  getDynamicRetryCount
};
