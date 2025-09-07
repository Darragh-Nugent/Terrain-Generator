const express = require('express');
const router = express.Router();
const path = require('path');


router.get('/', (req, res) => {
    // res.sendFile(path.join(__dirname, "..", "..", "client", 'UI', "index.html"));
    res.sendFile(path.join(__dirname, "..", "..", "client", 'UI', "terrain.html"));

});

module.exports = router;