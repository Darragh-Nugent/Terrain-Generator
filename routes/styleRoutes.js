const express = require("express");
const router = express.Router();
const ruleController = require("../controllers/ruleController");
const { loadStyles } = require("../models/styleModel");

// router.post("/addRule", ruleController.addRule);
// router.get("/getTerrainRules", ruleController.getTerrainRules);

router.get("/", async (req, res) => {
  const styles = await loadStyles();
  res.json(styles);
});


router.post("/", (req, res) => {
  const newRule = req.body;
  if (!newRule.name) {
    return res.status(400).json({ error: "Rule must have a name" });
  }
  res.json(addRule(newRule));
});




module.exports = router;
