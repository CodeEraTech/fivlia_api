module.exports = function (req, res, next) {
  const internalKey = req.headers["x-internal-key"];

  // Use a strong secret, keep it in .env
  if (!internalKey || internalKey !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ message: "Access Denied: Unauthorized Source" });
  }

  next();
};
