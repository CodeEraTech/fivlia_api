const mongoose = require("mongoose");
const slugify = require("slugify");

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true },
  content: { type: String, required: true },
  category: { type: String },
  tags: [{ type: String, trim: true,}],
  metaTitle: { type: String ,trim: true,},
  keywords: [{type: String,trim: true,},],
  metaDescription: { type: String ,trim: true,},
  image: { type: String },
  author: { type: String },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
},{timestamps:true});

// ✅ Generate SEO-friendly slug before saving
blogSchema.pre("save", function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model("Blog", blogSchema);
