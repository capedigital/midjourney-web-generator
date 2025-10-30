const express = require('express');
const router = express.Router();
const openrouterController = require('../controllers/openrouterController');
const auth = require('../middleware/auth');

// Public routes (no auth required for model data)
router.get('/models', openrouterController.getModels);
router.get('/models/top', openrouterController.getTopModels); // Legacy - returns popular
router.get('/models/popular', openrouterController.getTopPopular);
router.get('/models/cheapest', openrouterController.getTopCheapest);

// Semi-protected routes (auth optional - returns limited info if not authenticated)
router.get('/credits', openrouterController.getCredits);

// Fully protected routes (require auth)
router.get('/usage/:generationId', auth, openrouterController.getGenerationStats);

module.exports = router;
