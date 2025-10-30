const axios = require("axios");

const OLA_MAPS_API_KEY = "YHGoHrZHMgUpEeCA1CNKTg4iUePHYU2T8Upv6xdM";
const BASE_URL = "https://api.olamaps.io";

exports.getPlaceSuggestions = async (req, res) => {
  const { input } = req.query;
  try {
    if (!input || input.trim().length === 0) {
      return [];
    }

    const response = await axios.get(`${BASE_URL}/places/v1/autocomplete`, {
      params: {
        input,
        api_key: OLA_MAPS_API_KEY,
      },
    });
    const data = await response.data;
    if (data.status != "ok") {
      throw new Error(`Ola Maps API error: ${response.status}`);
    }
    return res.status(200).json({
      message: "Success",
      predictions: data.predictions,
    });
  } catch (error) {
    console.error("❌ Autocomplete error:", error.message);
    return res
      .status(500)
      .json({ message: "An error occurred!", error: error.message });
  }
};
