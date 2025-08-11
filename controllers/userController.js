const User = require("../models/userModels");
const bcrypt = require('bcrypt');

const Person = require("../data/Person");

exports.getAllUsers = (req, res) => {
    User.getAll()
    .then(row => {
        if (!row) return res.status(404).json({error: 'Task not found'});
        res.json(row);
    })
    .catch(err => res.status(500).json({error: 'Both names and password is required'}));
};

exports.AddUser = async (req, res) => {
  const {uName, pass} = req.body;
  if (!uName) return res.status(400).json({error: 'Username is required'});
  if (!pass) return res.status(400).json({error: 'Password name is required'});

  const hash = await bcrypt.hash(pass, 10);

  User.AddUser(uName, hash)
    .then(user => res.status(201).json(user))
    .catch(err => res.status(500).json({ error: err.message }));

};

// module.exports = {
//   getAllUsers,
//   AddUser
// };