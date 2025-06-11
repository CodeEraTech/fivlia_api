const calculateDeliveryTime = require('../config/google');
const Store = require('../modals/store');
const User = require('../modals/User');

exports.getDeliveryEstimate = async (req, res) => {
  try {
    const { id } = req.user;

    if (!id) return res.status(400).json({ message: "Missing user ID" });

    const user = await User.findById(id);
    if (!user || !user.location || !user.location.latitude || !user.location.longitude) {
      return res.status(400).json({ message: "User location not set" });
    }

    const userLat = parseFloat(user.location.latitude);
    const userLng = parseFloat(user.location.longitude);

    const stores = await Store.find();

    const results = await Promise.all(
      stores.map(async (store) => {
        if (!store.Latitude || !store.Longitude) return null;

        const result = await calculateDeliveryTime(
          parseFloat(store.Latitude),
          parseFloat(store.Longitude),
          userLat,
          userLng
        );

        if (!result) return null;

        return {
          storeId: store._id,
          storeName: store.storeName,
          city: store.city?.name || null,
          distance: result.distanceText,
          duration: result.durationText,
          raw: result,
        };
      })
    );

    const filtered = results.filter(Boolean);
    res.json(filtered);

  } catch (err) {
    console.error("💥 Delivery Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
