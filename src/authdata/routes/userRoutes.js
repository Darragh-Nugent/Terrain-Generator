const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateIdToken,authenticateAccessToken } = require('../middleware/cognito');

router.get("/getAllUsers", userController.getAllUsers);

router.post("/register", userController.AddUser);
// router.get('/register', userController.showRegisterPage);

router.post('/confirm-email', userController.confirmUserEmail);
// router.get('/confirm-email',userController.showConfirmEmailPage)
router.post('/resend-confirmation-code',userController.resendConfirmationCode)
router.post('/mfa', userController.respondToMfaChallenge)
router.post('/login',userController.login);
// router.get('/login', userController.showLoginPage);

// router.put('/:id/update',authenticateToken,userController.updateUserPassword); // req auth
// router.get('/:id/update',userController.showDeletePage); // req auth
router.post('/confirm-password',authenticateAccessToken,userController.confirmPassword); // req auth
router.post('/forgot-password',authenticateAccessToken, userController.forgotPassword) // req auth
router.delete('/:id/delete',authenticateAccessToken,userController.deleteUser); // req auth
// router.get('/:id/delete', authenticateAccessToken,userController.showDeletePage) // req auth

router.post('/logout', userController.logoutUser); // req auth

router.get('/me', authenticateIdToken, userController.getUserCookieInfo); // req auth


module.exports = router;
