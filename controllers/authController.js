const User = require("../models/userModels");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const Person = require("../data/Person");

exports.login = async (req, res) => {
  const { uName, password } = req.body;

  const user = await User.findByUsername(uName);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  console.log(password);

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

//   const token = jwt.sign({ id: user.id, uName: user.uName }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const token = jwt.sign({ id: user.id, uName: user.uName }, 'secretkey', { expiresIn: '1h' });


  res.json({ token });
};