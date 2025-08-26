const express = require("express");
const router = express.Router();
const ruleController = require("../controllers/ruleController");

// router.post("/addRule", ruleController.addRule);
// router.get("/getTerrainRules", ruleController.getTerrainRules);

router.get("/", (req, res) => {
  res.json(loadRules());
});

router.post("/", (req, res) => {
  const newRule = req.body;
  if (!newRule.name) {
    return res.status(400).json({ error: "Rule must have a name" });
  }
  res.json(addRule(newRule));
});




module.exports = router;
