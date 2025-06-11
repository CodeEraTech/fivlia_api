require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// 🧮 Calculate delivery time between store and user
const calculateDeliveryTime = async (storeLat, storeLng, userLat, userLng) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${storeLat},${storeLng}&destinations=${userLat},${userLng}&departure_time=now&mode=driving&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('📦 Full API response:', JSON.stringify(data, null, 2));

    if (data.status !== 'OK') throw new Error('Google API Error');

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
      console.warn('⚠️ Route status:', element.status);
      return {
        distanceText: '0 km',
        durationText: '0 min',
        trafficDurationText: '0 min',
        distanceValue: 0,
        durationValue: 0,
        trafficDurationValue: 0,
      };
    }

    return {
      distanceText: element.distance.text,
      durationText: element.duration.text,
      trafficDurationText: element.duration_in_traffic.text,
      distanceValue: element.distance.value,
      durationValue: element.duration.value,
      trafficDurationValue: element.duration_in_traffic.value,
    };
  } catch (error) {
    console.error('❌ Error fetching ETA:', error.message);
    return null;
  }
};

// 🌍 Reverse geocode user's lat/lng to get city + zone
const reverseGeocode = async (lat, lng) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    
    console.log('🧭 Geocode API response:', JSON.stringify(data, null, 2))

    if (data.status !== 'OK') throw new Error('Reverse geocoding failed');

    const components = data.results[0].address_components;

    const city = components.find(c => c.types.includes('locality'))?.long_name;
    const zone = components.find(c =>
      c.types.includes('sublocality') || c.types.includes('sublocality_level_1')
    )?.long_name;

    return { city, zone };
  } catch (err) {
    console.error('❌ Reverse geocoding error:', err.message);
    return null;
  }
};

module.exports = {
  calculateDeliveryTime,
  reverseGeocode
};
