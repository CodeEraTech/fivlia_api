const { calculateDeliveryTime, reverseGeocode, getStoresWithinRadius } = require('../config/google');
const Store = require('../modals/store');
const {SettingAdmin} = require('../modals/setting')
const User = require('../modals/User');
const { ZoneData } = require('../modals/cityZone');
const { getDistance } = require('../config/Ola'); // Add Ola import

function addFiveMinutes(durationText) {
  const match = durationText.match(/(\d+)\s*min/); // Extract number
  if (match) {
    const originalMinutes = parseInt(match[1]);
    const newMinutes = originalMinutes + 5;
    return `${newMinutes} mins`;
  }
  return durationText; // fallback in case format is unexpected
}

const getDeliveryEstimate = async (req, res) => {
  try {
    const { id } = req.user;
    if (!id) return res.status(200).json({ status: false, message: "Missing user ID" });

    const user = await User.findById(id);
    const currentLat = parseFloat(user?.location?.latitude);
    const currentLong = parseFloat(user?.location?.longitude);

    if (!currentLat || !currentLong) {
      return res.status(200).json({ status: false, message: "User location not set" });
    }

    const { zoneAvailable, matchedStores } = await getStoresWithinRadius(currentLat, currentLong);

    if (!zoneAvailable) {
      return res.json({ status: false, message: "Service zone not available" });
    }

    // Get admin settings for Map_Api
    const settings = await SettingAdmin.findOne().lean();
    const mapApiArray = settings?.Map_Api || [];
    const mapApi = mapApiArray[0] || {};

    const googleApi = mapApi?.google || {};
    const appleApi = mapApi?.apple || {};
    const olaApi = mapApi?.ola || {};

    const results = await Promise.all(
      matchedStores.map(async (store) => {
        if (!store.Latitude || !store.Longitude) return null;

        let result = null;

        // ✅ Use ONLY the API that admin has enabled
        if (googleApi.status && googleApi.api_key) {
          // Use Google API only
          try {
            result = await calculateDeliveryTime(
              parseFloat(store.Latitude),
              parseFloat(store.Longitude),
              currentLat,
              currentLong,
              googleApi.api_key
            );
            if (result) result.source = 'google';
          } catch (err) {
            console.log('Google API failed:', err.message);
            return null; // No fallback, just return null
          }
        } else if (olaApi.status && olaApi.api_key) {
          try {
            
            const olaResult = await getDistance(
              { lat: parseFloat(store.Latitude), lng: parseFloat(store.Longitude) },
              { lat: currentLat, lng: currentLong },
              olaApi.api_key
            );

            if (olaResult.status === 'OK') {
              result = {
                source: 'ola',
                distanceText: olaResult.distance.text,
                durationText: olaResult.duration.text,
                trafficDurationText: olaResult.duration.text,
                distanceValue: olaResult.distance.value,
                durationValue: olaResult.duration.value,
                trafficDurationValue: olaResult.duration.value
              };
            }
          } catch (err) {
            console.error('Ola API failed:', err.message);
            return null; // No fallback, just return null
          }
        } else if (appleApi.status && appleApi.api_key) {
          // Use Apple API only (when you implement it)
          console.log('Apple API not implemented yet');
          return null;
        }

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
    if (filtered.length === 0) {
      return res.json({ status: false, filtered });
    }

    res.json({ status: true, filtered });

  } catch (err) {
    console.error("💥 Delivery Error:", err);
    res.status(500).json({ status: false, message: "Server error", error: err.message });
  }
};

module.exports = { addFiveMinutes,getDeliveryEstimate }; 