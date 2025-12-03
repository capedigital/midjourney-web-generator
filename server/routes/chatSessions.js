const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const authMiddleware = require('../middleware/auth');
const chatSessionsService = require('../services/chatSessionsService');

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/chat-sessions/save
 * Save or update a chat session
 */
router.post('/save', asyncHandler(async (req, res) => {
    const { sessionId, title, messages, model } = req.body;
    
    if (!sessionId || !title || !messages || !Array.isArray(messages)) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: sessionId, title, messages (array)'
        });
    }
    
    const session = await chatSessionsService.saveSession(
        req.user.id,
        sessionId,
        title,
        messages,
        model
    );
    
    res.json({
        success: true,
        session: {
            id: session.id,
            sessionId: session.session_id,
            title: session.title,
            model: session.model,
            createdAt: session.created_at,
            updatedAt: session.updated_at
        }
    });
}));

/**
 * GET /api/chat-sessions/list
 * Get all chat sessions for the current user
 */
router.get('/list', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    
    const sessions = await chatSessionsService.getUserSessions(req.user.id, limit);
    
    res.json({
        success: true,
        sessions: sessions.map(s => ({
            id: s.id,
            sessionId: s.session_id,
            title: s.title,
            model: s.model,
            messageCount: parseInt(s.message_count),
            createdAt: s.created_at,
            updatedAt: s.updated_at
        }))
    });
}));

/**
 * GET /api/chat-sessions/:sessionId
 * Get a specific chat session with full message history
 */
router.get('/:sessionId', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    const session = await chatSessionsService.getSession(req.user.id, sessionId);
    
    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Chat session not found'
        });
    }
    
    res.json({
        success: true,
        session: {
            id: session.id,
            sessionId: session.session_id,
            title: session.title,
            messages: session.messages,
            model: session.model,
            createdAt: session.created_at,
            updatedAt: session.updated_at
        }
    });
}));

/**
 * DELETE /api/chat-sessions/:sessionId
 * Delete a chat session
 */
router.delete('/:sessionId', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    const deleted = await chatSessionsService.deleteSession(req.user.id, sessionId);
    
    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: 'Chat session not found'
        });
    }
    
    res.json({
        success: true,
        message: 'Chat session deleted'
    });
}));

module.exports = router;
