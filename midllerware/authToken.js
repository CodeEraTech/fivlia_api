const jwt = require('jsonwebtoken');
const User = require('../modals/User');

const verifyToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(404).json({ message: "A token is required for authorization" });
  }

  try {
    const decoded = jwt.verify(token, process.env.jwtSecretKey);

    // Fetch user by ID
    const user = await User.findById(decoded.id);

    if (!user) {
        console.log(user,token);
        
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    console.log("Token verified successfully");

    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Invalid Token" });
  }
};

module.exports = verifyToken;
