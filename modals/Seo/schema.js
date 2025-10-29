const mongoose = require("mongoose");

const schemaSettingSchema = new mongoose.Schema({
  page: { type: String, required: true }, // e.g. "home", "product", "about"
  type: { type: String, required: true }, // e.g. "Product", "Organization", etc.
  jsonData: { type: Object, required: true },
  status: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("SchemaSetting", schemaSettingSchema);
