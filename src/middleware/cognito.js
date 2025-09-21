const Cognito = require("@aws-sdk/client-cognito-identity-provider");
const jwt = require("aws-jwt-verify");
const crypto = require("crypto");
const redis = require("../../redisclient"); // Assuming redis is being used to blacklist tokens

const userPoolId = "ap-southeast-2_uLIJT0rVY";  // Your Cognito User Pool ID
const clientId = "3q30pl220o1tbp1tlqp8eiovse";  // Your Cognito App Client ID
const clientSecret = "o6tpgds0s9fion8uii6gs8fa31djefrkg7m4rgi7cukb47iontk";  // Your Cognito App Client Secret

// Verifiers for Cognito tokens (ID Token or Access Token)
const accessVerifier = jwt.CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: "access",  // Use 'access' or 'id' depending on the token
    clientId: clientId,
});

const idVerifier = jwt.CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: "id",  // Use 'access' or 'id' depending on the token
    clientId: clientId,
});

// Function to get the secret hash for Cognito signup (no change needed here)
function secretHash(clientId, clientSecret, username) {
    const hasher = crypto.createHmac('sha256', clientSecret);
    hasher.update(`${username}${clientId}`);
    return hasher.digest('base64');
}

// Function to sign in the user via Cognito and get tokens
const authenticateWithCognito = async (username, password) => {
    const client = new Cognito.CognitoIdentityProviderClient({
        region: "ap-southeast-2",
    });

    try {
        // Call Cognito to authenticate the user with username/password
        const command = new Cognito.InitiateAuthCommand({
            AuthFlow: Cognito.AuthFlowType.USER_PASSWORD_AUTH,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
                SECRET_HASH: secretHash(clientId, clientSecret, username),
            },
            ClientId: clientId,
        });

        const res = await client.send(command);
        console.log("Authentication success:", res);

        // Extract Cognito tokens
        const idToken = res.AuthenticationResult.IdToken;
        const accessToken = res.AuthenticationResult.AccessToken;

        // Return the tokens
        return { idToken, accessToken };

    } catch (error) {
        console.error("Authentication failed:", error);
        throw new Error("Authentication failed");
    }
};

// Middleware to verify a Cognito JWT token
const authenticateToken = async (req, res, next) => {
    const token = req.cookies.AccessToken;
    if (!token || typeof token !== 'string') {
        console.log('JSON web token missing.');
        if (expectsJson) {
            return res.status(401).json({ error: 'Please log in!' });
        } else {
            return res.redirect('/user/login?error=no_token');
        }
    }

    // Differentiate between API and page calls
    const expectsJson =
        req.xhr ||
        req.headers.accept?.includes('application/json') ||
        req.path.startsWith('/api') ||
        req.headers['content-type'] === 'application/json';

    try {
        // Verify the token with Cognito's JWT verifier (ID token or Access token)
        const result = await idVerifier.verify(token);  // or accessVerifier.verify(token) for Access Token

        const { sub, 'cognito:username': username } = result;

        req.user = {
            id: sub,
            username: username,
        };

        // Check if token is blacklisted
        const blacklisted = await isTokenBlacklisted(result.sub);

        if (blacklisted) {
            console.warn(`JWT with sub: ${result.sub} is blacklisted.`);
            return res.status(401).json({ error: 'Token has been invalidated' });
        }

        // Token is valid, proceed to the next middleware or route handler
        next();

    } catch (err) {
        console.error("Invalid token:", err);
        const errorType =
            err.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token';

        if (expectsJson) {
            return res.status(401).json({ error: errorType });
        } else {
            return res.redirect(`/user/login?error=${errorType}`);
        }
    }
};

// Blacklist a token (for example, during logout)
const isTokenBlacklisted = async (sub) => {
    const data = await redis.get(sub);
    return data === 'blacklisted';
};
// Function to invalidate the token (for example, during logout)
const blacklistToken = async (sub) => {
    await redis.set(sub, 'blacklisted', { EX: 3600 });  // Store `jti` for 30 minutes
    console.log(`Token with jti: ${sub} has been blacklisted.`);
};
module.exports = { authenticateWithCognito, authenticateToken, blacklistToken, isTokenBlacklisted };
