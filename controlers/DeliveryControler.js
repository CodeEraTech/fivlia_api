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

    let { latitude, longitude, city, zone } = user.location;

    // 📍 If city or zone is missing, reverse geocode ONCE
    if (!city || !zone) {
      const geoInfo = await reverseGeocode(parseFloat(latitude), parseFloat(longitude));
      if (!geoInfo?.city || !geoInfo?.zone) {
        return res.status(400).json({ message: "Could not determine user's zone" });
      }

      // ✅ Save to DB for future reuse
      user.location.city = geoInfo.city;
      user.location.zone = geoInfo.zone;
      await user.save();

      city = geoInfo.city;
      zone = geoInfo.zone;
    }

    // 🚀 Now use city and zone (from DB or API)
    const userZoneDoc = await ZoneData.findOne({ city });
    if (!userZoneDoc)
      return res.json({status:false, message: "Sorry, we are not available in your city yet." });

    const matchedZone = userZoneDoc.zones.find(z =>
      z.address.toLowerCase().includes(zone.toLowerCase())
    );
    if (!matchedZone)
      return res.json({status:false, message: "Sorry, we are not available in your zone yet." });

    const stores = await Store.find({
      zone: { $elemMatch: { _id: matchedZone._id } }
    });

    if (!stores.length)
      return res.json({status:false, message: "Sorry, no stores available in your zone." });

    const results = await Promise.all(
      stores.map(async (store) => {
        if (!store.Latitude || !store.Longitude) return null;

        const result = await calculateDeliveryTime(
          parseFloat(store.Latitude),
          parseFloat(store.Longitude),
          parseFloat(latitude),
          parseFloat(longitude)
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
    res.json({status:true,filtered});

  } catch (err) {
    console.error("💥 Delivery Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

