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
    if (!id) return res.status(400).json({ message: "Missing user ID" });

    const user = await User.findById(id);
    if (!user?.location?.latitude || !user?.location?.longitude)
      return res.status(400).json({ message: "User location not set" });

    const userLat = parseFloat(user.location.latitude);
    const userLng = parseFloat(user.location.longitude);

    // 🗺️ Reverse geocode to get city and zone
    const geoInfo = await reverseGeocode(userLat, userLng);

    if (!geoInfo?.city || !geoInfo?.zone)
      return res.status(400).json({ message: "Could not determine user's zone" });

    // 🏙️ Get zones from DB based on city
    const userZoneDoc = await ZoneData.findOne({ city: geoInfo.city });
    console.log('userZoneDoc', userZoneDoc);

    if (!userZoneDoc)
      return res.json({ message: "Sorry, we are not available in your city yet." });

    // 🔍 Fuzzy match zone name inside zones array
    const matchedZone = userZoneDoc.zones.find(z =>
      z.address.toLowerCase().includes(geoInfo.zone.toLowerCase())
    );
    console.log('matchedZone', matchedZone);

    if (!matchedZone)
      return res.json({ message: "Sorry, we are not available in your zone yet." });

    const stores = await Store.find({
      zone: { $elemMatch: { _id: matchedZone._id } }
    });

    if (!stores.length)
      return res.json({ message: "Sorry, no stores available in your zone." });

    // 🚚 Calculate delivery estimates
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
          duration: addFiveMinutes(result.trafficDurationText),
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
