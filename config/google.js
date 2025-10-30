require("dotenv").config();
const Store = require("../modals/store");
const haversine = require("haversine-distance");
const { ZoneData } = require("../modals/cityZone");
const moment = require("moment");
const fetch = (...args) =>
import("node-fetch").then(({ default: fetch }) => fetch(...args));

// 🧮 Calculate delivery time between store and user
const calculateDeliveryTime = async (
  storeLat,
  storeLng,
  userLat,
  userLng,
  apiKey
) => {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${storeLat},${storeLng}&destinations=${userLat},${userLng}&departure_time=now&mode=driving&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // console.log("📦 Full API response:", JSON.stringify(data, null, 2));

    if (data.status !== "OK") throw new Error("Google API Error");

    const element = data.rows[0].elements[0];

    if (element.status !== "OK") {
      console.warn("⚠️ Route status:", element.status);
      return {
        distanceText: "0 km",
        durationText: "0 min",
        trafficDurationText: "0 min",
        distanceValue: 0,
        durationValue: 0,
        trafficDurationValue: 0,
      };
    }
    // console.log(storeLat, storeLng, userLat, userLng);
    return {
      distanceText: element.distance.text,
      durationText: element.duration.text,
      trafficDurationText: element.duration_in_traffic.text,
      distanceValue: element.distance.value,
      durationValue: element.duration.value,
      trafficDurationValue: element.duration_in_traffic.value,
    };
  } catch (error) {
    console.error("❌ Error fetching ETA:", error.message);
    throw error;
  }
};

// 🌍 Reverse geocode user's lat/lng to get city + zone
const reverseGeocode = async (lat, lng) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    // console.log("🧭 Geocode API response:", JSON.stringify(data, null, 2));

    if (data.status !== "OK") throw new Error("Reverse geocoding failed");

    const components = data.results[0].address_components;

    const city = components.find((c) =>
      c.types.includes("locality")
    )?.long_name;
    const zone = components.find(
      (c) =>
        c.types.includes("sublocality") ||
        c.types.includes("sublocality_level_1")
    )?.long_name;

    return { city, zone };
  } catch (err) {
    console.error("❌ Reverse geocoding error:", err.message);
    return null;
  }
};

function isWithinZone(userLat, userLng, zone) {
  const userLocation = { lat: userLat, lon: userLng };
  const zoneLocation = { lat: zone.latitude, lon: zone.longitude };

  const distance = haversine(userLocation, zoneLocation);
  // console.log(distance, zone.range);
  return distance <= zone.range;
}

async function getStoresWithinRadius(userLat, userLng) {
  // Load all active stores from DB
  let allStores = await Store.find({ status: true }).lean();

  // Load zones and filter for active ones
  const cityZoneDocs = await ZoneData.find({});
  const activeZones = cityZoneDocs.flatMap((doc) =>
    doc.zones.filter((z) => z.status === true)
  );

  // Match user's location to zones
  const matchedZones = activeZones.filter((zone) =>
    isWithinZone(userLat, userLng, zone)
  );

  if (matchedZones.length === 0) {
    return { zoneAvailable: false };
  }

  const matchedZoneIds = matchedZones.map((z) => z._id.toString());

  // Filter stores that belong to matched zones
  const zoneStores = allStores.filter((store) =>
    store.zone.some((z) => matchedZoneIds.includes(z._id.toString()))
  );

  // Filter zone stores by time
  const currentTime = moment();

  const openStores = zoneStores.filter((store) => {
    const { openTime, closeTime } = store;
    if (openTime && closeTime) {
      const open = moment(openTime, "HH:mm");
      const close = moment(closeTime, "HH:mm");
      return currentTime.isBetween(open, close);
    }
    return true;
  });
  if (openStores.length === 0) {
    return {
      zoneAvailable: true,
      storesOpen: false,
    };
  }

  // Map matched and open stores
  const matchedStores = openStores.map((store) => ({
    ...store,
    soldBy: {
      storeId: store._id,
      storeName: store.Authorized_Store ? "Fivlia" : store.storeName,
      official: store.Authorized_Store ? 1 : 0,
    },
  }));
  return {
    zoneAvailable: true,
    storesOpen: true,
    matchedStores,
  };
}

function isWithinBanner(userLat, userLng, zone) {
  const userLocation = { lat: userLat, lon: userLng };
  const zoneLocation = { lat: zone.latitude, lon: zone.longitude };

  const distance = haversine(userLocation, zoneLocation);
  // console.log(
  //   `🛰️ Banner zone check | Distance: ${distance} | Range: ${zone.range}`
  // );
  return distance <= zone.range;
}

async function getBannersWithinRadius(userLat, userLng, banners = []) {
  const allZones = await ZoneData.find({});

  return banners.filter((banner) => {
    if (!Array.isArray(banner.city)) return false; // city must be array

    // Check each city assigned to banner
    return banner.city.some((cityObj) => {
      const cityDoc = allZones.find(
        (city) => city.city.toLowerCase() === cityObj.name.toLowerCase()
      );

      if (!cityDoc) return false;

      // find if any zone matches the radius condition
      const validZone = cityDoc.zones.find(
        (zone) => zone.status === true && isWithinBanner(userLat, userLng, zone)
      );

      return Boolean(validZone);
    });
  });
}


function findAvailableDriversNearUser(userLat, userLng, driverLat, driverLng) {
  const user = { lat: userLat, lon: userLng };
  const driverz = { lat: driverLat, lon: driverLng };

  return Math.round(haversine(user, driverz)); // meters
}

module.exports = {
  calculateDeliveryTime,
  reverseGeocode,
  getStoresWithinRadius,
  getBannersWithinRadius,
  findAvailableDriversNearUser,
};
