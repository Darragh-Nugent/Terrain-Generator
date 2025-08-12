const jwt = require("jsonwebtoken");

const tokenSecret =
   "e9aae26be08551392be664d620fb422350a30349899fc254a0f37bfa1b945e36ff20d25b12025e1067f9b69e8b8f2ef0f767f6fff6279e5755668bf4bae88588";

// Create a token with username embedded, setting the validity period.
exports.generateAccessToken = (user) => {
   return jwt.sign({ id: user.id, uName: user.uName }, tokenSecret, { expiresIn: "30m" });
};

exports.authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, tokenSecret, (err, user) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;  // Attach user payload (e.g., user.id) to request
    next();
  });
};