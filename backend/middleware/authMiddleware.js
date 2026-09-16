const jwt = require("jsonwebtoken");
const SECRET_KEY = "supersecretkey";

const verifyToken = (req, res, next) => {
  let token = req.headers["x-access-token"] || req.headers.authorization;

  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7);
  }

  if (!token) {
    return res.status(403).json({ message: "No token provided!" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized!" });
    }
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.user = decoded;
    next();
  });
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (roles.includes(req.userRole)) {
      next();
      return;
    }
    res.status(403).json({
      message: `Require one of the following roles: ${roles.join(", ")}`,
    });
  };
};

const isAdmin = (req, res, next) => {
  if (["super-admin", "hr", "admin"].includes(req.userRole)) {
    next();
    return;
  }
  res.status(403).json({ message: "Require HR/Admin Role!" });
};

const isManager = (req, res, next) => {
  if (["super-admin", "manager", "hr", "admin"].includes(req.userRole)) {
    next();
    return;
  }
  res.status(403).json({ message: "Require Manager Role!" });
};

const isAccountant = (req, res, next) => {
  if (req.userRole === "accountant") {
    next();
    return;
  }
  res.status(403).json({ message: "Require Accountant Role!" });
};

const isNotEmployee = (req, res, next) => {
  if (req.userRole !== "employee") {
    next();
    return;
  }
  res.status(403).json({ message: "Access denied for Employee role!" });
};

module.exports = {
  verifyToken,
  checkRole,
  isAdmin,
  isManager,
  isAccountant,
  isNotEmployee,
};
