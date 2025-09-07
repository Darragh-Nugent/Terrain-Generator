const jwt = require("jsonwebtoken");
const redis = require('../../redisclient');
const { v4: uuidv4 } = require('uuid');

// Using a fixed authentication secret for demonstration purposes.
// Ideally this would be stored in a secrets manager and retrieved here.
// To create a new randomly chosen secret instead, you can use:
//
// tokenSecret = require("crypto").randomBytes(64).toString("hex");
//
const tokenSecret =
   "e9aae26be08551392be664d620fb422350a30349899fc254a0f37bfa1b945e36ff20d25b12025e1067f9b69e8b8f2ef0f767f6fff6279e5755668bf4bae88588";

// Create a token with username embedded, setting the validity period.
const generateAccessToken = async (payload) => {
   const jti = uuidv4();
   const token = jwt.sign(
      { ...payload, jti },
      tokenSecret,
      { expiresIn: '30m' }
   );
   return token;
};

const isTokenBlacklisted = async (jti) => {
   const data = await redis.get(jti);
   return data === 'blacklisted';
};

// Chatgpt
// Middleware to verify a token and respond with user information
async function authenticateToken(req, res, next) {
   const token = req.cookies.authToken;
   // differentiate between api calls or page 
   const expectsJson =
      req.xhr ||
      req.headers.accept?.includes('application/json') ||
      req.path.startsWith('/api') ||
      req.headers['content-type'] === 'application/json';

   if (!token || typeof token !== 'string') {
      console.log('JSON web token missing.');
      if (expectsJson) {
         return res.status(401).json({ error: 'Please log in!' });
      } else {
         return res.redirect('/user/login?error=no_token');
      }
   }

   try {
      const decoded = jwt.verify(token, tokenSecret);
      const blacklisted = await isTokenBlacklisted(decoded.jti);
      if (blacklisted) {
         console.warn(`JWT with jti: ${decoded.jti} is blacklisted.`);
         return res.status(401).json({ error: 'Token has been invalidated' });
      }
      const { id, username } = decoded;
      console.log(`authToken verified for user: ${id || 'unknown'}: ${username || 'unknown'} at ${req.url}`);
      req.user = decoded;
      next();


   } catch (err) {
      console.warn(`JWT verification failed at ${req.url}:`, err.name, err.message);

      const errorType =
         err.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token';

      if (expectsJson) {
         return res.status(401).json({ error: errorType });
      } else {
         return res.redirect(`/user/login?error=${errorType}`);
      }
   }
}

// Function to invalidate the token (for example, during logout)
const blacklistToken = async (jti) => {
   await redis.set(jti, 'blacklisted', { EX: 1800 });  // Store `jti` for 30 minutes
   console.log(`Token with jti: ${jti} has been blacklisted.`);
};


module.exports = { generateAccessToken, authenticateToken, blacklistToken, tokenSecret, isTokenBlacklisted };
