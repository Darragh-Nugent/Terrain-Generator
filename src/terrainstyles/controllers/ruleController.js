const ruleModel = require("../models/styleModel");

exports.getTerrainRules = async (req, res) => {
  const {terrainId} = req.body; 
  try {
    const rules = await ruleModel.getAllFromUser(terrainId);
    if (!rules) return res.status(404).json({error: 'There are no rules for this terrain'});
    res.status(201).json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addRule = async (req, res) => {
  const {condition, value, terrainId} = req.body;
  if (!condition) return res.status(400).json({error: 'Condition is required'});
  if (!value) return res.status(400).json({error: 'Value is required'});
  if (!terrainId) return res.status(400).json({error: 'Terrain id is required'});

  try {
    const newRule = await ruleModel.addRule(terrainId, condition, value);
    res.status(201).json(newRule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
