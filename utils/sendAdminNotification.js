// utils/sendAdminNotification.js
const Notification = require("../modals/Notification");
const { adminSocketMap } = require("./driverSocketMap");

 // Sends a notification to the admin panel (non-blocking)
exports.sendAdminNotification = async (payload) => {
  try {
    console.log('started')
    // Save in DB (async, but no await used in main flow)
    Notification.create({
      title: payload.title,
      description: payload.description,
      type: payload.type || "general",
      image: payload.image || "",
      city: payload.city || "",
      data: payload.data || {},
      screen:payload.screen || ""
    }).then((saved) => {
      // Emit via socket once saved
      const adminSocket = adminSocketMap.get("admin");
      if (adminSocket) {
        adminSocket.emit("newNotification", {
          ...saved.toObject(),
          isNew: true,
        });
        console.log("📢 Notification sent to admin:", saved.title);
      }
    }).catch((err) => {
      console.error("❌ Notification DB save error:", err.message);
    });
  } catch (error) {
    console.error("❌ sendAdminNotification error:", error.message);
  }
};
