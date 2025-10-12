const e = require("express");
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

exports.addStyle = async (req, res) => {
  try {
    const newStyle = req.body;
    await styleModel.addStyle(newStyle);
    res.status(200).json({ message: "Style added successfully." });
  } catch (err) {
    console.error("Error adding style:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

exports.getColours = async (req, res) => {
  const { styleQuery } = req.query;
  try {
    const styles = await styleModel.loadStyles();
    const result = styles.find(style => style.name === styleQuery); 

    if (result) {
    res.json({ colour: result });
    } else {
      res.json({ colour: "#00ff00" });
    }
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
