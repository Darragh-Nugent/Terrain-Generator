const styleModel = require("../models/styleModel.js");
const path = require('path');

exports.getStyles = async (req, res) => {
    const styles = await styleModel.loadStyles();
    res.json(styles);
}
