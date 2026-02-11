const haversine = require("haversine-distance");

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getDistanceMeters = async ({ storeLat, storeLng, userLat, userLng }) => {
  const sLat = toNumber(storeLat);
  const sLng = toNumber(storeLng);
  const uLat = toNumber(userLat);
  const uLng = toNumber(userLng);

  if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) return 0;
  if (!Number.isFinite(uLat) || !Number.isFinite(uLng)) return 0;

  return Math.round(
    haversine({ lat: uLat, lon: uLng }, { lat: sLat, lon: sLng })
  );
};

const getDistanceKm = (distanceMeters) => {
  return toNumber(distanceMeters) / 1000;
};

const getBillableKm = (distanceMeters) => {
  const distanceKm = getDistanceKm(distanceMeters);
  return Math.max(1, Math.ceil(distanceKm));
};

const computeDeliveryCharge = ({ distanceMeters, fixedFirstKm, perKm }) => {
  const billableKm = getBillableKm(distanceMeters);
  const fixed = toNumber(fixedFirstKm);
  const per = toNumber(perKm);
  return fixed + per * Math.max(0, billableKm - 1);
};

module.exports = {
  getDistanceMeters,
  getDistanceKm,
  getBillableKm,
  computeDeliveryCharge,
};
