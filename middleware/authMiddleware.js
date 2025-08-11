const jwt = require("jsonwebtoken");

exports.authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, 'secretkey', (err, user) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;  // Attach user payload (e.g., user.id) to request
    next();
  });
};