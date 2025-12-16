const jwt = require("jsonwebtoken");
const Staff = require("../modals/roleBase/adminStaff");
const Role = require("../modals/roleBase/roles");

module.exports = async function authStaff(req, res, next) {
  try {
    // 1. Read token from header
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token missing" });
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.jwtSecretKey);
    } catch (error) {
      return res.status(401).json({ message: "Invalid Token" });
    }

    // 3. If user is MOBILE APP USER → No role system needed

    // 4. Fetch staff from DB
    const staff = await Staff.findById(decoded._id).lean();
    if (!staff) {
      return res.status(401).json({ message: "Staff account not found" });
    }

    // 5. Fetch role of staff
    const role = await Role.findById(staff.roleId).lean();

    staff.permissions = role?.permissions || [];
    staff.roleName = role?.roles;
    req.staff = staff; // Store with full permissions

    return next();

  } catch (err) {
    console.error("authStaff error:", err);
    return res.status(500).json({ message: "Authentication failed" });
  }
};
