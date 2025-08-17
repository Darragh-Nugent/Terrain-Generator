const jwt = require("jsonwebtoken");

const tokenSecret =
   "e9aae26be08551392be664d620fb422350a30349899fc254a0f37bfa1b945e36ff20d25b12025e1067f9b69e8b8f2ef0f767f6fff6279e5755668bf4bae88588";

// Create a token with username embedded, setting the validity period.
exports.generateAccessToken = (user) => {
   return jwt.sign({ id: user.id, uName: user.uName }, tokenSecret, { expiresIn: "30m" });
};

exports.authenticateJWT = (req, res, next) => {
  console.log(req.headers.authorization);
  console.log(req.query.token);
  const authHeader = req.headers.authorization || req.query.token && `Bearer ${req.query.token}`;
  if (!authHeader) {
    return res.sendStatus(401);
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, tokenSecret, (err, user) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;  // Attach user payload (e.g., user.id) to request
    next();
  });
  console.log(token);
};