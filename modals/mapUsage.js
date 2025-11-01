const mongoose = require("mongoose");

const mapUsageSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ["app", "web"],
    required: true,
  },
  callType: {
    type: String,
    enum: [
      "autocomplete",
      "placedetails",
      "reverseGeocode",
      "getDistance",
      "directions",
      "geocode",
    ],
    required: true,
  },
  subCallType: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    default: 1,
  },
  lastCalledAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique per combination (source + callType + subCallType)
mapUsageSchema.index(
  { source: 1, callType: 1, subCallType: 1 },
  { unique: true }
);

module.exports = mongoose.model("MapUsage", mapUsageSchema);
