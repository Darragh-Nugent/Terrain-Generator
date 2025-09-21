const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateToken } = require('../middleware/authMiddleware');


router.get("/getAllUsers", userController.getAllUsers);

router.post("/register", userController.AddUser);
router.get('/register', userController.showRegisterPage);

router.post('/confirm-email', userController.confirmUserEmail);
router.post('/resend-confirmation-code',userController.resendConfirmationCode)
router.get('/confirm-email',userController.showConfirmEmailPage)
router.post('/login',userController.login);
router.get('/login', userController.showLoginPage);

// router.put('/:id/update',authenticateToken,userController.updateUserPassword); // req auth
router.get('/:id/update', authenticateToken,userController.showDeletePage); // req auth
router.post('/confirm-password',authenticateToken,userController.confirmPassword); // req auth
router.post('/forgot-password',authenticateToken, userController.forgotPassword) // req auth
router.delete('/:id/delete',authenticateToken,userController.deleteUser); // req auth
router.get('/:id/delete', authenticateToken,userController.showDeletePage) // req auth

router.post('/:id/logout',authenticateToken,userController.logoutUser); // req auth
router.get('/:id/delete', authenticateToken,userController.showDeletePage) // req auth

router.get('/me', authenticateToken, userController.getUserCookieInfo);


module.exports = router;
