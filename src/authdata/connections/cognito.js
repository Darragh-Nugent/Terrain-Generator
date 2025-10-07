const awsJwt = require("aws-jwt-verify");
const memcache = require("../../../memcachedClient");
const clientId = process.env.CLIENT_ID;
const userPoolId = process.env.USER_POOL_ID;

// Verifiers for Cognito tokens (ID Token or Access Token)
const accessVerifier = awsJwt.CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: "access",  // Use 'access' or 'id' depending on the token
    clientId: clientId,
});

const idVerifier = awsJwt.CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: "id",  // Use 'access' or 'id' depending on the token
    clientId: clientId,
});

const createTokenMiddleware = (tokenName, verifier) => {
    return async (req, res, next) => {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        // console.log(req.headers)
        let token;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        else {
            return res.status(404).json({ error: 'Authorization header missing' });
        }
        const expectsJson =
            req.xhr ||
            req.headers.accept?.includes('application/json') ||
            req.path.startsWith('/api') ||
            req.headers['content-type'] === 'application/json';

        if (!token || typeof token !== 'string' || token === 'undefined' || token === 'null') {
            console.log('JWT missing.');
            return expectsJson
                ? res.status(401).json({ error: 'Please log in!' })
                : res.redirect('/user/login?error=no_token');
        }
        try {
            const decoded = await verifier.verify(token);
            const {
                sub,
                'cognito:username': cognitoUsername = decoded.username,
                email,
                email_verified,
                given_name,
                family_name,
                'custom:role': role,
                'custom:tenant_id': tenantId,
                username,
                jti,
            } = decoded;
            console.log(decoded);
            const finalUsername = cognitoUsername ?? username;
            req.user = {
                id: sub,
                username: finalUsername,
                email,
                name: `${given_name || ''} ${family_name || ''}`.trim(),
                email_verified,
                role,
                tenantId,
                token
            };
            const blacklisted = await isTokenBlacklisted(jti);
            if (blacklisted) {
                console.warn(`JWT for user ${sub} is blacklisted.`);
                return res.status(401).json({ error: 'Token has been invalidated' });
            }
            next();
        } catch (err) {
            console.error("JWT verification failed:", err);
            const errorType = err.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token';

            return expectsJson
                ? res.status(401).json({ error: errorType })
                : res.redirect(`/user/login?error=${errorType}`);
        }
    };
};

const authenticateAccessToken = createTokenMiddleware('accessToken', accessVerifier);
const authenticateIdToken = createTokenMiddleware('idToken', idVerifier);

// Blacklist a token (for example, during logout)
const isTokenBlacklisted = async (jti) => {
    const result = await memcache.get(jti);
    return result.value?.toString() === 'blacklisted';
};
// Function to invalidate the token (for example, during logout)
const blacklistToken = async (jti) => {
    await memcache.set(jti, 'blacklisted', { expires: 3600 }); // 1 hour TTL
    console.log(`Token with jti: ${jti} has been blacklisted.`);
};
module.exports = { authenticateAccessToken, blacklistToken, isTokenBlacklisted, authenticateIdToken };
