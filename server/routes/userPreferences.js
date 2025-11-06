const express = require('express');
const router = express.Router();
const userPreferencesController = require('../controllers/userPreferencesController');
const auth = require('../middleware/auth');

// All routes require authentication
router.get('/', auth, userPreferencesController.getPreferences);
router.put('/ai-model', auth, userPreferencesController.updateAIModel);
router.put('/target-platform', auth, userPreferencesController.updateTargetPlatform);
router.put('/', auth, userPreferencesController.updatePreferences);

module.exports = router;
