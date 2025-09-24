const express = require("express");
const router = express.Router();
const styleController = require("../controllers/styleController");
const { authenticateAccessToken } = require('../middleware/cognito');

router.get("/", authenticateAccessToken, styleController.getStyles);


router.post("/", (req, res) => {
  const newRule = req.body;
  if (!newRule.name) {
    return res.status(400).json({ error: "Rule must have a name" });
  }
  res.json(addRule(newRule));
});




module.exports = router;
