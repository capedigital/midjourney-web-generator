const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const discordController = require('../controllers/discordController');

// All routes require authentication
router.use(auth);

// Send a single prompt to Discord
router.post('/send', discordController.sendPrompt);

// Send multiple prompts to Discord (batch)
router.post('/send-batch', discordController.sendBatch);

// Test Discord connection
router.post('/test', discordController.testConnection);

module.exports = router;
