const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/getAllUsers", userController.getAllUsers);
router.post("/addUser", userController.AddUser);




module.exports = router;
