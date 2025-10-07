const express = require("express");
const router = express.Router();
const authController = require("../../authentication/controllers/authController");
const { authenticateAccessToken } = require('../middleware/cognito');

router.get('/me', authenticateAccessToken, authController.verifyAuth); 


module.exports = router;
