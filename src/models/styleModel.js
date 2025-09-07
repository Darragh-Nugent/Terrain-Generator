const fs = require("fs");
const path = require("path");

const RULES_PATH = path.join(__dirname, "..", "data", "rules.json");

exports.loadStyles = () => {
  const data = fs.readFileSync(RULES_PATH);
  return JSON.parse(data);
}

exports.addRule = async (newRule) => {
  const rules = loadStyles();
  rules.push(newRule);
  fs.writeFileSync(RULES_PATH, JSON.stringify(rules, null, 2));
  return newRule;
}