const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const authenticate = require('../middleware/auth');
const midjourneyController = require('../controllers/midjourneyController');

// All routes require authentication
router.use(authenticate);

// Initialize browser
router.post('/initialize', asyncHandler(midjourneyController.initialize));

// Setup authentication (opens visible browser for manual login)
router.post('/setup', asyncHandler(midjourneyController.setupAuth));

// Check login status
router.get('/status', asyncHandler(midjourneyController.checkLogin));

// Login (opens browser for manual login)
router.post('/login', asyncHandler(midjourneyController.login));

// Submit single prompt
router.post('/submit', asyncHandler(midjourneyController.submitPrompt));

// Submit batch of prompts
router.post('/batch', asyncHandler(midjourneyController.submitBatch));

// Close browser
router.post('/close', asyncHandler(midjourneyController.close));

module.exports = router;
