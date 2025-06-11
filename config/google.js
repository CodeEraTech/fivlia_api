require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)); // Fix ESM issue



const calculateDeliveryTime = async (
  storeLat,
  storeLng,
  userLat ,
  userLng
) => {
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

module.exports = calculateDeliveryTime;
