module.exports = function checkPermission(requiredPerm) {
  return (req, res, next) => {
    const staff = req.staff;
    if (!staff) {
      return res.status(403).json({ message: "Staff authentication required" });
    }

    if (!staff.permissions.includes(requiredPerm)) {
      return res.status(403).json({ message: "Permission denied" });
    }

    next();
  };
};
