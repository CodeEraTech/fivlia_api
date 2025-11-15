// utils/fetchImage.js
const axios = require("axios");
const AWS = require("aws-sdk");
const pLimit = require("p-limit");

const s3 = new AWS.S3();
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

const limit = pLimit(5); // Only 5 requests at once

exports.fetchAndUploadImage = (name) =>
  limit(async () => {
    try {
      // 1) Search image
      const search = await axios.get(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(name)}&per_page=1`,
        { headers: { Authorization: PEXELS_API_KEY } }
      );

      if (!search.data.photos.length) return null;
      const imageUrl = search.data.photos[0].src.large;
      // 2) Download image buffer
      const img = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const buffer = Buffer.from(img.data);

      // 3) Upload to AWS
      const fileName = `products/${Date.now()}-${name.replace(/\s+/g, "_")}.jpg`;

       await s3
        .upload({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType: "image/jpeg",
        })
        .promise();

      return `/${fileName}`;
    } catch (err) {
      console.log(`❌ Image failed for ${name}:`, err.message);
      return null;
    }
  });
