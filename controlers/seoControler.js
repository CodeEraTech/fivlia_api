const Sitemap = require("../modals/Seo/sitemap");
const SchemaSetting = require("../modals/Seo/schema");
const fs = require("fs");
const path = require("path");

exports.createSitemap = async (req, res) => {
  try {
    const body = req.body || {};

    // If request has body, create new sitemap entry
    const existing = await Sitemap.findOne({ url: body.url });

    if (existing) {
      // Update existing sitemap entry if it exists
      await Sitemap.findByIdAndUpdate(existing._id, body, { new: true });
    } else if (Object.keys(body).length > 0) {
      // Create a new sitemap entry if none exists
      await Sitemap.create(body);
    }

    // Fetch all active URLs
    const sitemaps = await Sitemap.find({ status: true });

    // Build XML content
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${sitemaps
      .map(
        (item) => `
      <url>
        <loc>${item.url}</loc>
        <lastmod>${item.lastmod.toISOString()}</lastmod>
        <changefreq>${item.changefreq}</changefreq>
        <priority>${item.priority}</priority>
      </url>`
      )
      .join("")}
    </urlset>`;

    // Define the file path for sitemap.xml
    const filePath = path.join(
      __dirname,
      "../../../../fivlia/public_html/sitemap.xml"
    );

    // Ensure the directory exists before trying to save
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Directory created: ${dirPath}`);
    }

    // Check if the sitemap.xml file already exists
    if (fs.existsSync(filePath)) {
      // If the file exists, update it
      fs.writeFileSync(filePath, xmlContent, "utf8");
      console.log("Sitemap.xml updated successfully.");
    } else {
      // If the file does not exist, create it
      fs.writeFileSync(filePath, xmlContent, "utf8");
      console.log("Sitemap.xml created successfully.");
    }

    // Respond to client with XML content and success message
    res.header("Content-Type", "application/xml");
    return res.status(201).json({
      message:
        body && Object.keys(body).length > 0
          ? "Sitemap URL added & sitemap.xml regenerated successfully"
          : "Sitemap.xml regenerated successfully",
      xmlContent,
    });
  } catch (error) {
    console.error("❌ createSitemap error:", error);
    return res.status(500).json({
      message: "Failed to create sitemap",
      error: error.message,
    });
  }
};

// 📋 Get All Sitemap URLs
exports.getSitemap = async (req, res) => {
  try {
    const sitemap = await Sitemap.find();
    return res.status(200).json({ sitemap });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch sitemaps", error: error.message });
  }
};

exports.deleteSitemap = async (req, res) => {
  try {
    await Sitemap.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Sitemap entry deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to delete sitemap", error: error.message });
  }
};

// ➕ Add Schema
exports.createSchema = async (req, res) => {
  try {
    const schema = await SchemaSetting.create(req.body);
    return res
      .status(201)
      .json({ message: "Schema added successfully", schema });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to add schema", error: error.message });
  }
};

// 📋 Get All Schemas
exports.getAllSchemas = async (req, res) => {
  try {
    const schemas = await SchemaSetting.find().sort({ createdAt: -1 });
    return res.status(200).json({ schemas });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch schemas", error: error.message });
  }
};

// ✏️ Update Schema
exports.updateSchema = async (req, res) => {
  try {
    const schema = await SchemaSetting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    return res.status(200).json({ message: "Schema updated", schema });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update schema", error: error.message });
  }
};

// 🗑️ Delete Schema
exports.deleteSchema = async (req, res) => {
  try {
    await SchemaSetting.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Schema deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to delete schema", error: error.message });
  }
};
