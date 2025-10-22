const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { validateBody, schemas } = require('../middleware/validation');

// Public routes
router.post('/register', validateBody(schemas.register), authController.register);
router.post('/login', validateBody(schemas.login), authController.login);

// Protected routes (require authentication)
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);
router.post('/change-password', auth, authController.changePassword);
router.post('/logout', auth, authController.logout);
router.get('/verify', auth, authController.verifyToken);

module.exports = router;
