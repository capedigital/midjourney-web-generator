const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const authenticate = require('../middleware/auth');
const ideogramController = require('../controllers/ideogramController');

// All routes require authentication
router.use(authenticate);

// Initialize browser
router.post('/initialize', asyncHandler(ideogramController.initialize));

// Setup authentication (opens visible browser for manual login)
router.post('/setup', asyncHandler(ideogramController.setupAuth));

// Check login status
router.get('/status', asyncHandler(ideogramController.checkLogin));

// Login (opens browser for manual login)
router.post('/login', asyncHandler(ideogramController.login));

// Submit single prompt
router.post('/submit', asyncHandler(ideogramController.submitPrompt));

// Submit batch of prompts
router.post('/batch', asyncHandler(ideogramController.submitBatch));

// Close browser
router.post('/close', asyncHandler(ideogramController.close));

module.exports = router;
