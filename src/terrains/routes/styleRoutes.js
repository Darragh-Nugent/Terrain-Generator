const express = require("express");
const router = express.Router();
const styleController = require("../controllers/styleController");
const { authenticateAccessToken } = require('../../authentication/middleware/cognito');

router.get("/", authenticateAccessToken, styleController.getStyles);
router.post("/", authenticateAccessToken, styleController.addStyle);




module.exports = router;
