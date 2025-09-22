const User = require("../models/userModels");
// const bcrypt = require('bcrypt');
// const jwt = require("jsonwebtoken");
const path = require('path');
const Cognito = require("@aws-sdk/client-cognito-identity-provider");
const awsJwt = require("aws-jwt-verify");
const jwt = require('jsonwebtoken');
const { generateAccessToken, blacklistToken, tokenSecret } = require('../middleware/authMiddleware')
const userPoolId = "ap-southeast-2_uLIJT0rVY";
const clientId = "3q30pl220o1tbp1tlqp8eiovse"


exports.getAllUsers = (req, res) => {
    User.getAll()
        .then(row => {
            if (!row) return res.status(404).json({ error: 'Task not found' });
            res.json(row);
        })
        .catch(err => res.status(500).json({ error: 'Both names and password is required' }));
};

// exports.logoutUser = async (req, res) => {
//     const username = req.user.username;
//     const id = req.user.id;
//     if (username && id) {
//         const exists = await User.checkUserExists(req.user.username);
//         if (!exists) return res.status(404).json({ error: "User does not exist" })

//         // Blacklists token
//         const token = req.cookies.authToken; // access token
//         const decoded = jwt.verify(token, tokenSecret);
//         await blacklistToken(decoded.sub);
//         await User.invalidateToken(token)
//         // Clear the token from the cookies (logout the user)
//         res.clearCookie('authToken', { httpOnly: true, secure: false });

//         return res.status(200).json({ message: "User had logged out" });
//     }
//     else return res.status(404).json({ error: "Missing authentication cookies!" })
// }


const accessVerifier = awsJwt.CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: 'access', // or 'id' depending on the token type
    clientId: clientId,
});

exports.logoutUser = async (req, res) => {
    try {
        const token = req.cookies.accessToken;
        const username = req.user.username;
        const id = req.user.id;
        if (!token) {
            return res.status(401).json({ error: "Missing auth token" });
        }
        // if (username && id) {
        //     const exists = await User.checkUserExists(req.user.username);
        //     if (!exists) return res.status(404).json({ error: "User does not exist" })
        // }
        const payload = await accessVerifier.verify(token);  // <-- verifies signature, expiration, issuer, etc.

        // Blacklist token or user session
        await blacklistToken(payload.sub);  // or payload.sub if your blacklist uses sub

        // Clear cookie
        res.clearCookie('accessToken', { httpOnly: true, secure: false }); // change to true when https
        res.clearCookie('idToken', { httpOnly: true, secure: false }); // change to true when https
        return res.status(200).json({ message: "User logged out successfully" });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

// exports.login = async (req, res) => {
//     const { username, password } = req.body;
//     if (!username || !password) return res.status(400).json({ error: 'Please enter in a username and password!' });
//     try {
//         const user = await User.verifyUser(username, password);
//         const authToken = await generateAccessToken({
//             username: user.username,
//             id: user.id
//         });
//         res.cookie('authToken', authToken, {
//             httpOnly: true,
//             secure: false,         // Set to true in production (HTTPS)
//             sameSite: 'Strict',
//             maxAge: 60 * 30 * 1000 // 30minutes
//         });
//         return res.status(200).json(user);
//     } catch (err) {
//         return res.status(400).json({ error: err.message });
//     }
// };

exports.login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Please enter in a username and password!' });
    try {
        const user = await User.verifyUser(username, password);
        res.cookie('accessToken', user.AccessToken, {
            httpOnly: true,
            secure: false,         // Set to true in production (HTTPS)
            sameSite: 'Strict',
            maxAge: 60 * 60 * 1000 // 60minutes
        });
        res.cookie('idToken', user.IdToken, {
            httpOnly: true,
            secure: false,         // Set to true in production (HTTPS)
            sameSite: 'Strict',
            maxAge: 60 * 60 * 1000 // 60minutes
        });
        return res.status(200).json(user);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.respondToMfaChallenge = async (req, res) => {
    const { username, mfaCode, session, challengeName } = req.body;

    if (!username || !mfaCode || !session) {
        return res.status(400).json({ error: 'Username, MFA code, and session are required.' });
    }

    try {
        const response = await User.respondToMFA(username, mfaCode, session, challengeName);

        if (response.AuthenticationResult) {
            const { IdToken, AccessToken } = response.AuthenticationResult;
            const decodedToken = jwt.decode(IdToken);
            console.log(IdToken,AccessToken);
            const { sub, email, 'cognito:username': cognitoUsername } = decodedToken;
            res.cookie('accessToken', AccessToken, {
                httpOnly: true,
                secure: false,         // Set to true in production (HTTPS)
                sameSite: 'Strict',
                maxAge: 60 * 60 * 1000 // 60minutes
            });
            res.cookie('idToken', IdToken, {
                httpOnly: true,
                secure: false,         // Set to true in production (HTTPS)
                sameSite: 'Strict',
                maxAge: 60 * 60 * 1000 // 60minutes
            });

            return res.status(200).json({
                message: 'MFA verified and login successful.',
                id: sub,
                email,
                username: cognitoUsername,
                AccessToken,
                IdToken,
            });
        } else {
            return res.status(401).json({ error: 'MFA verification failed.' });
        }
    } catch (err) {
        console.error('Error in MFA challenge:', err);
        return res.status(500).json({ error: `Error responding to MFA challenge: ${err.name}` });
    }
};
exports.AddUser = async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username, password and email are all required' });
    try {
        const user = await User.AddUser(username, email, password);
        res.status(201).json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.confirmUserEmail = async (req, res) => {
    const { username, confirmationCode } = req.body;

    if (!username || !confirmationCode) {
        return res.status(400).json({ error: 'Username and confirmation code are required' });
    }

    try {
        const result = await User.confirmUser(username, confirmationCode);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.resendConfirmationCode = async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const result = await User.resendConfirmationCode(username);
        res.status(200).json(result);
    } catch (err) {
        console.error('Error resending code:', err);
        res.status(500).json({ error: err.message });
    }
};

// exports.deleteUser = async (req, res) => {
//     try {

//         const token = req.cookies.authToken;
//         const decoded = jwt.verify(token, tokenSecret);
//         // Get user ID from the URL (route is /user/:id/delete)
//         const userId = req.params.id;
//         // Check if the decoded token's user ID matches the one in the URL
//         if (Number(decoded.id) !== Number(userId)) {
//             return res.status(403).json({ error: 'You are not authorized to delete this user' });
//         }
//         await blacklistToken(decoded.jti);
//         // Clear the token from the cookies (logout the user)
//         res.clearCookie('authToken', { httpOnly: true, secure: false });

//         const results = await User.remove(userId);
//         if (!results.deleted) return res.status(404).json({ error: 'User ID not found!' });
//         return res.status(200).json({ message: 'User has been deleted!' });
//     } catch (err) {
//         return res.status(500).json({ error: err.message })
//     }
// };

exports.deleteUser = async (req, res) => {
    try {
        // Get the AccessToken from the cookies (this assumes the token is already there)
        const accessToken = req.cookies.accessToken;
        await blacklistToken(decoded.sub);
        // Call Cognito's DeleteUser command to delete the user from Cognito
        const result = await User.remove(accessToken);

        // Clear the authentication cookie
        res.clearCookie('accessToken', { httpOnly: true, secure: false });
        res.clearCookie('idToken', { httpOnly: true, secure: false }); // change to true when https
        res.status(200).json({ message: "Your account has been successfully deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting your account: " + err.message });
    }
};
// exports.updateUserPassword = async (req, res) => {
//     const { old_password, new_password } = req.body;
//     const username = req.user.username;
//     try {
//         const result = await User.update(username, old_password, new_password);
//         if (!result.updated) return res.status(404).json({ error: 'User ID not found!' });
//         return res.status(200).json({ message: 'User updated' });
//     } catch (err) {
//         return res.status(500).json({ error: err.message })
//     }
// };

// Step 1: Trigger forgot password (send code)
exports.forgotPassword = async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });

    try {
        const result = await User.forgotPassword(username);
        res.status(200).json({ message: "Password reset code sent to your email." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Step 2: Confirm password reset with code
exports.confirmPassword = async (req, res) => {
    const { username, verificationCode, newPassword } = req.body;

    if (!username || !verificationCode || !newPassword) {
        return res.status(400).json({ error: "Username, verification code, and new password are required" });
    }

    try {
        const result = await User.confirmPassword(username, verificationCode, newPassword);
        res.status(200).json({ message: "Password updated successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.showDeletePage = async (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '..', '..', 'client', 'UI', 'option.html'));
    } catch (err) {
        console.error("Error loading delete page:", err);
        res.status(500).send('Server error');
    }
};

exports.showRegisterPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'UI', 'register.html'));
};

exports.showLoginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'UI', 'login.html'));
};
exports.showConfirmEmailPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'UI', 'email_confirmation.html'));
}
exports.getUserCookieInfo = async (req, res) => {
    try {
        // req user set via jwt middleware
        const username = req.user.username;
        const id = req.user.id;
        if (username && id) {
            // const exists = await User.checkUserExists(req.user.username);
            // if (!exists) return res.status(404).json({ error: "User does not exist" })

            console.log(`authToken verified for user (${id}): ${username} at ${req.url}`);
            // Return the user info
            return res.json({ username: req.user.username, id: req.user.id });
        }
        else return res.status(404).json({ error: "Missing authentication cookies!" })

    } catch (err) {
        console.warn(`Error in getUserCookieInfo: ${err.message}`);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};