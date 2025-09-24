const Cognito = require("@aws-sdk/client-cognito-identity-provider");
const awsJwt = require("aws-jwt-verify");
const crypto = require("crypto");
const redis = require("../../redisclient"); // Assuming redis is being used to blacklist tokens

const userPoolId = "ap-southeast-2_uLIJT0rVY";  // Your Cognito User Pool ID
const clientId = "3q30pl220o1tbp1tlqp8eiovse";  // Your Cognito App Client ID
const clientSecret = "o6tpgds0s9fion8uii6gs8fa31djefrkg7m4rgi7cukb47iontk";  // Your Cognito App Client Secret

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

// Function to get the secret hash for Cognito signup 
function secretHash(clientId, clientSecret, username) {
    const hasher = crypto.createHmac('sha256', clientSecret);
    hasher.update(`${username}${clientId}`);
    return hasher.digest('base64');
}


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
    const data = await redis.get(jti);
    return data === 'blacklisted';
};
// Function to invalidate the token (for example, during logout)
const blacklistToken = async (jti) => {
    await redis.set(jti, 'blacklisted', { EX: 3600 });  // Store `jti` for 30 minutes
    console.log(`Token with jti: ${jti} has been blacklisted.`);
};
module.exports = { authenticateAccessToken, blacklistToken, isTokenBlacklisted, authenticateIdToken };
