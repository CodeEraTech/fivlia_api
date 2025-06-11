const calculateDeliveryTime = require('../config/google');
const Store = require('../modals/store');

exports.getDeliveryEstimate = async (req, res) => {
  try {
    const stores = await Store.find();

    const results = await Promise.all(
      stores.map(async (store) => {
        if (!store.Latitude || !store.Longitude) return null;

        const result = await calculateDeliveryTime(
          parseFloat(store.Latitude),
          parseFloat(store.Longitude)
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

    const filtered = results.filter(Boolean); // remove nulls (stores without valid result)

    res.json(filtered);
  } catch (err) {
    console.error("💥 Delivery Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
