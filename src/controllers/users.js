const User = require('../models/user');
const { generateAccessToken, blacklistToken, tokenSecret } = require('../middleware/jwt')
const path = require('path');
const jwt = require("jsonwebtoken");

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.getAll()
        return res.status(200).json({ users: users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUserCookieInfo = async (req, res) => {
    try {
        // req user set via jwt middleware
        const username = req.user.username;
        const id = req.user.id;
        if (username && id) {
            const exists = await User.checkUserExists(req.user.username);
            if (!exists) return res.status(404).json({ error: "User does not exist" })

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

exports.logoutUser = async (req, res) => {
    const username = req.user.username;
    const id = req.user.id;
    if (username && id) {
        const exists = await User.checkUserExists(req.user.username);
        if (!exists) return res.status(404).json({ error: "User does not exist" })

        // Blacklists token
        const token = req.cookies.authToken;
        const decoded = jwt.verify(token, tokenSecret);
        await blacklistToken(decoded.jti);
        // Clear the token from the cookies (logout the user)
        res.clearCookie('authToken', { httpOnly: true, secure: false });

        return res.status(200).json({ message: "User had logged out" });
    }
    else return res.status(404).json({ error: "Missing authentication cookies!" })
}

exports.login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Please enter in a username and password!' });
    try {
        const user = await User.verifyUser(username, password);
        const authToken = await generateAccessToken({
            username: user.username,
            id: user.id
        });
        res.cookie('authToken', authToken, {
            httpOnly: true,
            secure: false,         // Set to true in production (HTTPS)
            sameSite: 'Strict',
            maxAge: 60 * 30 * 1000 // 30minutes
        });
        return res.status(200).json(user);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

exports.createUser = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Please enter in a username and password!' });
    try {
        const result = await User.create(username, password);
        return res.status(201).json(result.username);
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: 'Username already exists.' });
        }
        console.error('DB Error: ', err);
        res.status(500).json({ error: 'Server error' })
    }
};

exports.updateUserPassword = async (req, res) => {
    const { old_password, new_password } = req.body;
    const username = req.user.username;
    try {
        const result = await User.update(username, old_password, new_password);
        if (!result.updated) return res.status(404).json({ error: 'User ID not found!' });
        return res.status(200).json({ message: 'User updated' });
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
};

exports.deleteUser = async (req, res) => {
    try {

        const token = req.cookies.authToken;
        const decoded = jwt.verify(token, tokenSecret);
        // Get user ID from the URL (route is /user/:id/delete)
        const userId = req.params.id;
        // Check if the decoded token's user ID matches the one in the URL
        if (Number(decoded.id) !== Number(userId)) {
            return res.status(403).json({ error: 'You are not authorized to delete this user' });
        }
        await blacklistToken(decoded.jti);
        // Clear the token from the cookies (logout the user)
        res.clearCookie('authToken', { httpOnly: true, secure: false });

        const results = await User.remove(userId);
        if (!results.deleted) return res.status(404).json({ error: 'User ID not found!' });
        return res.status(200).json({ message: 'User has been deleted!' });
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
};

exports.showDeletePage = async (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '..', '..', 'client', 'option.html'));
    } catch (err) {
        console.error("Error loading delete page:", err);
        res.status(500).send('Server error');
    }
};

exports.showRegisterPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'register.html'));
};

exports.showLoginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'login.html'));
};
