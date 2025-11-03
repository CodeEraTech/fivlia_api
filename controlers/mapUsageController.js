const MapUsage = require("../modals/mapUsage");

exports.trackMapUsage = async (req, res) => {
  try {
    const { source, callType, subCallType } = req.body;
    if (!source || !callType || !subCallType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await MapUsage.findOneAndUpdate(
      { source, callType, subCallType },
      {
        $inc: { count: 1 },
        $set: { lastCalledAt: new Date() },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: "Map usage tracked successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error tracking map usage:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
