const User = require("../models/userModels");
const path = require('path');
const awsJwt = require("aws-jwt-verify");
const jwt = require('jsonwebtoken');
const { blacklistToken } = require('../middleware/cognito')
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




const accessVerifier = awsJwt.CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: 'access', // or 'id' depending on the token type
    clientId: clientId,
});

exports.logoutUser = async (req, res) => {
    try {
        const token = req.user.token
        if (!token) {
            return res.status(401).json({ error: "Missing authentication token" });
        }

        const payload = await accessVerifier.verify(token);  // <-- verifies signature, expiration, issuer, etc.

        // Blacklist token or user session
        await blacklistToken(payload.sub);  // or payload.sub if your blacklist uses sub

        // Clear cookie - handle in frontend remove local storage -------------------
        // res.clearCookie('userInfo');
        // res.clearCookie('accessToken');
        // res.clearCookie('idToken');
        return res.status(200).json({ message: "User logged out successfully" });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};


exports.login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Please enter in a username and password!' });
    try {
        const user = await User.verifyUser(username, password);
        // handle in frontend ------------- set local storage (only if MFA ISNT required (it is)---------------------------
        // if (user.AccessToken && user.IdToken) {
        //     res.cookie('accessToken', user.AccessToken, {
        //         httpOnly: true,
        //         secure: false,         // Set to true in production (HTTPS)
        //         sameSite: 'Strict',
        //         maxAge: 60 * 60 * 1000 // 60minutes
        //     });
        //     res.cookie('idToken', user.IdToken, {
        //         httpOnly: true,
        //         secure: false,         // Set to true in production (HTTPS)
        //         sameSite: 'Strict',
        //         maxAge: 60 * 60 * 1000 // 60minutes
        //     });
        // }
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
        console.log("response from mfa cognito", response)
        if (response.AuthenticationResult) {
            const { IdToken, AccessToken } = response.AuthenticationResult;
            const decodedToken = jwt.decode(IdToken);
            console.log(decodedToken);
            const { sub, email, 'cognito:username': cognitoUsername } = decodedToken;
             // handle in frontend ------------- set local storage ---------------------------
            // res.cookie('accessToken', AccessToken, {
            //     httpOnly: true,
            //     secure: false,         // Set to true in production (HTTPS)
            //     sameSite: 'Strict',
            //     path: '/',
            //     maxAge: 60 * 60 * 1000 // 60minutes
            // });
            // res.cookie('idToken', IdToken, {
            //     httpOnly: true,
            //     secure: false,         // Set to true in production (HTTPS)
            //     sameSite: 'Strict',
            //     path: '/',
            //     maxAge: 60 * 60 * 1000 // 60minutes
            // });
            const userInfo = JSON.stringify({ id: sub, email, username: cognitoUsername });
            // res.cookie('userInfo', JSON.stringify(userInfo), {
            //     httpOnly: false,
            //     secure: false,         // Set to true in production (HTTPS)
            //     sameSite: 'Strict',
            //     path: '/',
            //     maxAge: 60 * 60 * 1000 // 60minutes
            // });
            return res.status(200).json({
                message: 'MFA verified and login successful.',
                id: sub,
                email,
                username: cognitoUsername,
                AccessToken,
                IdToken,
                UserInfo: userInfo,
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


exports.deleteUser = async (req, res) => {
    try {
        // Get the AccessToken from the cookies (this assumes the token is already there)
        const accessToken = req.cookies.accessToken;
        const decoded = jwt.decode(accessToken);
        await blacklistToken(decoded.sub);
        // Call Cognito's DeleteUser command to delete the user from Cognito
        const result = await User.remove(accessToken);

        // Clear cookie - handle in frontend remove local storage -------------------
        // Clear the authentication cookie
        // res.clearCookie('accessToken');
        // res.clearCookie('idToken'); // change to true when https
        // res.clearCookie('userInfo')
        res.status(200).json({ message: "Your account has been successfully deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting your account: " + err });
    }
};

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