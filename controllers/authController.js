const User = require("../models/userModels");
const authMiddleware = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const Person = require("../data/Person");

exports.login = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findByUsername(username);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  console.log(password);

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

  const token = authMiddleware.generateAccessToken(user);


  res.json({ token });
};