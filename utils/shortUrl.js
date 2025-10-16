const axios = require("axios");

async function shortenUrl(longUrl) {
  try {
    const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    return res.data; // short URL string
  } catch (err) {
    console.error("TinyURL Error:", err);
    return longUrl; // fallback
  }
}
module.exports = { shortenUrl };