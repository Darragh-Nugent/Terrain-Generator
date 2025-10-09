exports.verifyAuth = async (req, res) => {
    // middleware attaches user
    if (!req.user.username) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(200).json({ message: 'Authenticated', user: req.user });
};
