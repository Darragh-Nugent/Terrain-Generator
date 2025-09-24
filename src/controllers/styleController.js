const styleModel = require("../models/styleModel.js");
const path = require('path');

exports.getStyles = async (req, res) => {
  try {
    const styles = await styleModel.loadStyles();
    res.json(styles || []);
  } catch (err) {
    console.error("Error loading styles:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
