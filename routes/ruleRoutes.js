const express = require("express");
const router = express.Router();
const ruleController = require("../controllers/ruleController");

router.post("/addRule", ruleController.addRule);
router.get("/getTerrainRules", ruleController.getTerrainRules);




module.exports = router;
