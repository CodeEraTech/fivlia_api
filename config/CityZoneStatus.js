// const ZoneData = require("../models/ZoneData"); // Adjust path if needed

// const getActiveCityAndZone = async (cityName, zoneName) => {
//   try {
//     const cityDoc = await ZoneData.findOne({
//       city: { $regex: new RegExp(`^${cityName}$`, "i") }
//     }).lean();

//     if (!cityDoc) return null;

//     const zone = cityDoc.zones.find(
//       (z) => z.address?.toLowerCase() === zoneName.toLowerCase() && z.status === true
//     );

//     if (!zone) return null;

//     return {
//       city: {
//         _id: cityDoc._id,
//         name: cityDoc.city,
//       },
//       zone,
//     };
//   } catch (err) {
//     console.error("❌ Error in getActiveCityAndZone:", err.message);
//     return null;
//   }
// };

// module.exports = {
//  getActiveCityAndZone
// };


