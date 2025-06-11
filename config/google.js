const fetch = require('node-fetch'); // only needed in Node.js (install: npm i node-fetch)
require('dotenv').config();

const DEFAULT_USER_LOCATION = {
lat:29.149187,
lng:75.721657,
};

const calculateDeliveryTime = async (storeLat, storeLng, userLat = DEFAULT_USER_LOCATION.lat, userLng = DEFAULT_USER_LOCATION.lng) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${storeLat},${storeLng}&destinations=${userLat},${userLng}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') throw new Error('Google API Error');

    const element = data.rows[0].elements[0];
    if (element.status !== 'OK') throw new Error('No route found');

    return {
      distanceText: element.distance.text,
      durationText: element.duration.text,
      distanceValue: element.distance.value,
      durationValue: element.duration.value,
    };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
};


// paste the same code here
module.exports = calculateDeliveryTime;
