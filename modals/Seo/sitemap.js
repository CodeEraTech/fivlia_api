const mongoose = require("mongoose");

const sitemapSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true },
  priority: { type: Number, default: 0.8 },
  changefreq: {
    type: String,
    enum: ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"],
    default: "weekly",
  },
  lastmod: { type: Date, default: Date.now },
  status: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Sitemap", sitemapSchema);
