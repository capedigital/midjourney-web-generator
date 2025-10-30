const express = require('express');
const router = express.Router();
const promptsController = require('../controllers/promptsController');
const auth = require('../middleware/auth');
const { validateBody, validateParams, schemas } = require('../middleware/validation');

// Protected routes (require authentication)
router.post('/generate', auth, validateBody(schemas.generatePrompts), promptsController.generate);
router.post('/save-imported', auth, promptsController.saveImported);
router.get('/history', auth, promptsController.getHistory);
router.get('/recent', auth, promptsController.getRecent);
router.get('/search', auth, promptsController.search);
router.get('/stats', auth, promptsController.getStats);
router.put('/session/:sessionId', auth, validateParams({ sessionId: { required: true, type: 'number' } }), promptsController.updateSession);
router.delete('/session/:sessionId', auth, validateParams({ sessionId: { required: true, type: 'number' } }), promptsController.deleteSession);

// Public route (for Claude MCP to access)
router.get('/session/:sessionId', validateParams({ sessionId: { required: true, type: 'number' } }), promptsController.getSession);

// Admin routes
router.get('/admin/model-stats', auth, promptsController.getModelStats);

module.exports = router;
