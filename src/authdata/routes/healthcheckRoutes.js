const express = require("express");
const router = express.Router();

router.get('/', (req, res) => {
  // Respond with 200 OK and a simple message
  res.status(200).send('OK');
});

module.exports = router;
