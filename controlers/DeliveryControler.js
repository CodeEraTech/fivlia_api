const { calculateDeliveryTime, reverseGeocode } = require('../config/google');
const Store = require('../modals/store');
const User = require('../modals/User');
const { ZoneData } = require('../modals/cityZone');

function addFiveMinutes(durationText) {
  const match = durationText.match(/(\d+)\s*min/); // Extract number
  if (match) {
    const originalMinutes = parseInt(match[1]);
    const newMinutes = originalMinutes + 5;
    return `${newMinutes} mins`;
  }
  return durationText; // fallback in case format is unexpected
}



exports.getDeliveryEstimate = async (req, res) => {
  try {
    const { id } = req.user;
    if (!id) return res.status(400).json({ status: false, message: "Missing user ID" });

    const user = await User.findById(id);

    const currentLat = parseFloat(user?.location?.latitude);
    const currentLong = parseFloat(user?.location?.longitude);

    if (!currentLat || !currentLong)
      return res.status(400).json({ status: false, message: "User location not set" });

    let { city, zone, reverseLat, reverseLong } = user.location;

    const latChanged = reverseLat !== currentLat;
    const longChanged = reverseLong !== currentLong;

    // 📍 If city/zone missing OR location changed, run reverse geocoding
    if (!city || !zone || latChanged || longChanged) {
      const geoInfo = await reverseGeocode(currentLat, currentLong);

      if (!geoInfo?.city || !geoInfo?.zone) {
        return res.status(400).json({ status: false, message: "Could not determine user's zone" });
      }

      city = geoInfo.city;
      zone = geoInfo.zone;

      // ✅ Save reverse geocode and update location
      user.location.city = city;
      user.location.zone = zone;
      user.location.reverseLat = currentLat;
      user.location.reverseLong = currentLong;
      await user.save();
    }

    // 🚀 Now use city and zone
    const userZoneDoc = await ZoneData.findOne({ city });
    if (!userZoneDoc)
      return res.json({ status: false, message: "Sorry, we are not available in your city yet." });

    const matchedZone = userZoneDoc.zones.find(z =>
      z.address.toLowerCase().includes(zone.toLowerCase())
    );

    if (!matchedZone)
      return res.json({ status: false, message: "Sorry, we are not available in your zone yet." });

    const stores = await Store.find({
      zone: { $elemMatch: { _id: matchedZone._id } }
    });

    if (!stores.length)
      return res.json({ status: false, message: "Sorry, no stores available in your zone." });

    const results = await Promise.all(
      stores.map(async (store) => {
        if (!store.Latitude || !store.Longitude) return null;

        const result = await calculateDeliveryTime(
          parseFloat(store.Latitude),
          parseFloat(store.Longitude),
          currentLat,
          currentLong
        );

        if (!result) return null;

        return {
          storeId: store._id,
          storeName: store.storeName,
          city: store.city?.name || null,
          distance: result.distanceText,
          duration: addFiveMinutes(result.trafficDurationText),
          raw: result,
        };
      })
    );

    const filtered = results.filter(Boolean);
    res.json({ status: true, filtered });

  } catch (err) {
    console.error("💥 Delivery Error:", err);
    res.status(500).json({ status: false, message: "Server error", error: err.message });
  }
};


