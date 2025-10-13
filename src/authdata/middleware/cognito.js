const awsJwt = require("aws-jwt-verify");
const memcache = require("./memcachedClient");
const clientId = process.env.CLIENT_ID;
const userPoolId = process.env.USER_POOL_ID;

// Verifiers for Cognito tokens (ID Token or Access Token)
const accessVerifier = awsJwt.CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: "access",  // Use 'access' or 'id' depending on the token
    clientId: clientId,
    clockSkew: 300
});

const idVerifier = awsJwt.CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: "id",  // Use 'access' or 'id' depending on the token
    clientId: clientId,
});

const createTokenMiddleware = (tokenName, verifier) => {
    return async (req, res, next) => {
        console.log(`[${tokenName}] Token middleware triggered`, {
            path: req.path,
            method: req.method,
            authHeader: req.headers.authorization || req.headers.Authorization
        });

        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        let token;

        const logContext = {
            path: req.path,
            method: req.method,
            ip: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
            time: new Date().toISOString(),
        };

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            console.warn(`[${tokenName}] Authorization header missing`, logContext);
            return res.status(404).json({ error: 'Authorization header missing' });
        }

        const expectsJson =
            req.xhr ||
            req.headers.accept?.includes('application/json') ||
            req.path.startsWith('/api') ||
            req.headers['content-type'] === 'application/json';

        if (!token || typeof token !== 'string' || token === 'undefined' || token === 'null') {
            console.warn(`[${tokenName}] JWT missing or malformed`, { ...logContext, token });
            return expectsJson
                ? res.status(401).json({ error: 'Please log in!' })
                : res.redirect('/user/login?error=no_token');
        }

        console.log("Verifying");
        try {
            const decoded = await verifier.verify(token);
            console.log("Verified");
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

            console.info(`[${tokenName}] Token verified`, { sub, username: cognitoUsername, jti, ...logContext });

            req.user = {
                id: sub,
                username: cognitoUsername ?? username,
                email,
                name: `${given_name || ''} ${family_name || ''}`.trim(),
                email_verified,
                role,
                tenantId,
                token,
            };

            console.log("Blacklisting");
            const blacklisted = await isTokenBlacklisted(jti);
            if (blacklisted) {
                console.warn(`[${tokenName}] JWT is blacklisted`, { jti, sub, ...logContext });
                return res.status(401).json({ error: 'Token has been invalidated' });
            }

            console.log("Finishe blacklisting");

            next();
        } catch (err) {
            const errorType = err.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token';
            console.error(`[${tokenName}] JWT verification failed`, {
                error: err.message,
                name: err.name,
                stack: err.stack?.split('\n')[0], // avoid dumping full stack unless needed
                tokenSnippet: token?.slice?.(0, 10),
                ...logContext
            });

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
