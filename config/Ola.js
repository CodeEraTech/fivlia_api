require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * Calculate distance matrix using Ola Maps API
 * @param {Array} origins - Array of origin coordinates [{lat, lng}, ...]
 * @param {Array} destinations - Array of destination coordinates [{lat, lng}, ...]
 * @returns {Object} Distance matrix response
 */
const getDistanceMatrix = async (origins, destinations,apiKey) => {
  try {
          // console.log('Ola API key in fuction:', apiKey);
    if (!apiKey) {
      throw new Error('No API key provided to getDistanceMatrix');
    }

    // Format origins and destinations as URL-encoded strings
    const originsStr = origins.map(coord => `${coord.lat},${coord.lng}`).join('|');
    const destinationsStr = destinations.map(coord => `${coord.lat},${coord.lng}`).join('|');

    const url = `https://api.olamaps.io/routing/v1/distanceMatrix?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destinationsStr)}&api_key=${apiKey}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Request-Id': 'XXX',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();

    return data;

  } catch (error) {
    console.error('❌ Error fetching Ola distance matrix:', error.message);
    console.error('❌ Full error:', error);
    throw error;
  }
};

/**
 * Calculate distance between two points
 * @param {Object} origin - Origin coordinates {lat, lng}
 * @param {Object} destination - Destination coordinates {lat, lng}
 * @returns {Object} Distance and duration information
 */
const getDistance = async (origin, destination, apiKey) => {
  try {
    const result = await getDistanceMatrix([origin], [destination], apiKey);
    
    if (result.status === 'SUCCESS' && result.rows && result.rows[0] && result.rows[0].elements && result.rows[0].elements[0]) {
      const element = result.rows[0].elements[0];
      
      if (element.status === 'OK') {
        return {
          distance: {
            text: `${(element.distance / 1000).toFixed(1)} km`,
            value: element.distance
          },
          duration: {
            text: `${Math.round(element.duration / 60)} mins`,
            value: element.duration * 1000 // Convert to milliseconds like Google
          },
          status: 'OK'
        };
      } else {
        return {
          status: element.status,
          error: element.error_message || 'Unable to calculate distance'
        };
      }
    } else {
      console.log('🔍 Invalid response structure:', {
        status: result.status,
        hasRows: !!result.rows,
        rowsLength: result.rows?.length,
        hasElements: !!result.rows?.[0]?.elements,
        elementsLength: result.rows?.[0]?.elements?.length
      });
      return {
        status: 'ERROR',
        error: 'Invalid response from Ola API'
      };
    }
  } catch (error) {
    console.error('❌ Error calculating distance:', error.message);
    return {
      status: 'ERROR',
      error: error.message
    };
  }
};

/**
 * Calculate distances from one origin to multiple destinations
 * @param {Object} origin - Origin coordinates {lat, lng}
 * @param {Array} destinations - Array of destination coordinates [{lat, lng}, ...]
 * @returns {Array} Array of distance results
 */
const getDistancesFromOrigin = async (origin, destinations) => {
  try {
    const result = await getDistanceMatrix([origin], destinations);
    
    if (result.status === 'OK' && result.rows && result.rows[0] && result.rows[0].elements) {
      return result.rows[0].elements.map((element, index) => {
        if (element.status === 'OK') {
          return {
            destination: destinations[index],
            distance: element.distance,
            duration: element.duration,
            status: 'OK'
          };
        } else {
          return {
            destination: destinations[index],
            status: element.status,
            error: element.error_message || 'Unable to calculate distance'
          };
        }
      });
    } else {
      throw new Error('Invalid response from Ola API');
    }
  } catch (error) {
    console.error('❌ Error calculating distances from origin:', error.message);
    throw error;
  }
};

/**
 * Calculate full distance matrix between multiple origins and destinations
 * @param {Array} origins - Array of origin coordinates [{lat, lng}, ...]
 * @param {Array} destinations - Array of destination coordinates [{lat, lng}, ...]
 * @returns {Object} Full distance matrix with origins and destinations
 */
const getFullDistanceMatrix = async (origins, destinations) => {
  try {
    const result = await getDistanceMatrix(origins, destinations);
    
    if (result.status === 'OK' && result.rows) {
      return {
        status: 'OK',
        origins: result.origin_addresses || origins,
        destinations: result.destination_addresses || destinations,
        rows: result.rows.map((row, originIndex) => ({
          origin: origins[originIndex],
          elements: row.elements.map((element, destIndex) => {
            if (element.status === 'OK') {
              return {
                destination: destinations[destIndex],
                distance: element.distance,
                duration: element.duration,
                status: 'OK'
              };
            } else {
              return {
                destination: destinations[destIndex],
                status: element.status,
                error: element.error_message || 'Unable to calculate distance'
              };
            }
          })
        }))
      };
    } else {
      return {
        status: 'ERROR',
        error: 'Invalid response from Ola API'
      };
    }
  } catch (error) {
    console.error('❌ Error calculating full distance matrix:', error.message);
    throw error;
  }
};

module.exports = {
  getDistanceMatrix,
  getDistance,
  getDistancesFromOrigin,
  getFullDistanceMatrix
};