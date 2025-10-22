const express = require('express');
const router = express.Router();
const PromptGenerator = require('../utils/generator');
const auth = require('../middleware/auth');
const pool = require('../config/database');

// Generate prompts (protected route)
router.post('/generate', auth, async (req, res) => {
    try {
        const { promptText, model } = req.body;
        
        if (!promptText) {
            return res.status(400).json({ error: 'Prompt text is required' });
        }

        const generator = new PromptGenerator();
        const prompts = await generator.generateWithChatGPT(promptText, model);

        // Save to database
        const result = await pool.query(
            'INSERT INTO prompt_sessions (user_id, input_text, prompts, model, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
            [req.user.id, promptText, JSON.stringify(prompts), model || 'openai/gpt-4.1-mini']
        );

        res.json({
            success: true,
            sessionId: result.rows[0].id,
            prompts: prompts
        });
    } catch (error) {
        console.error('Generate error:', error);
        res.status(500).json({ 
            error: 'Failed to generate prompts',
            message: error.message 
        });
    }
});

// Get session prompts (for Claude to access)
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM prompt_sessions WHERE id = $1',
            [sessionId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = result.rows[0];
        res.json({
            id: session.id,
            prompts: session.prompts,
            model: session.model,
            created_at: session.created_at
        });
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ error: 'Failed to retrieve session' });
    }
});

// Get user's prompt history
router.get('/history', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, input_text, prompts, model, created_at FROM prompt_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );

        res.json({ sessions: result.rows });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to retrieve history' });
    }
});

module.exports = router;
