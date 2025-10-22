const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Placeholder for template routes
// TODO: Implement template loading from config or database

router.get('/', auth, async (req, res) => {
    try {
        // For now, return empty array
        // Later, load from ../../../templates/ or database
        res.json({ templates: [] });
    } catch (error) {
        console.error('Templates error:', error);
        res.status(500).json({ error: 'Failed to retrieve templates' });
    }
});

module.exports = router;
