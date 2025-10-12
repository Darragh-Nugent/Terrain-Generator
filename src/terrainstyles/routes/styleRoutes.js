const express = require("express");
const router = express.Router();
const styleController = require("../controllers/styleController");
const { authenticateAccessToken } = require('../middleware/cognito');

router.get('/healthcheck', (req, res) => {
  res.status(200).send('OK');
});

router.get("/", authenticateAccessToken, styleController.getStyles);
router.post("/", authenticateAccessToken, styleController.addStyle);
router.get("/colours", styleController.getColours);




module.exports = router;
