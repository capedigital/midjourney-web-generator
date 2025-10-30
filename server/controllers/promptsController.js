const promptsService = require('../services/promptsService');
const PromptGenerator = require('../utils/generator');
const { asyncHandler } = require('../middleware/errorHandler');

class PromptsController {
    /**
     * Generate new prompts
     */
    generate = asyncHandler(async (req, res) => {
        const { promptText, model } = req.body;

        // Generate prompts using AI
        const generator = new PromptGenerator();
        const prompts = await generator.generateWithChatGPT(promptText, model);

        // Save session to database
        const session = await promptsService.createSession({
            userId: req.user.id,
            inputText: promptText,
            prompts,
            model: model || 'openai/gpt-4.1-mini'
        });

        res.json({
            success: true,
            sessionId: session.id,
            prompts: session.prompts,
            created_at: session.created_at
        });
    });

    /**
     * Save imported prompts to history
     */
    saveImported = asyncHandler(async (req, res) => {
        const { prompts, source } = req.body;

        if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid prompts array'
            });
        }

        // CRITICAL: Clean prompts to ONLY base text - no prefix, no parameters
        const cleanPrompts = prompts.map(p => {
            let promptText = typeof p === 'string' ? p : p.text || p.prompt || String(p);
            
            // Strip EVERYTHING - only keep base text
            promptText = promptText
                .replace(/^\/imagine\s+prompt:\s*/i, '')  // Remove /imagine prefix
                .replace(/^prompt:\s*/i, '')  // Remove standalone "prompt:" prefix
                .replace(/\s+--[\w-]+(?:\s+[\w:,.\/\-]+)?/g, '')  // Remove ALL parameters
                .trim();
            
            return promptText;
        });

        // Save session to database
        const session = await promptsService.createSession({
            userId: req.user.id,
            inputText: `Imported from ${source || 'unknown source'}`,
            prompts: cleanPrompts,
            model: 'imported'
        });

        res.json({
            success: true,
            sessionId: session.id,
            count: cleanPrompts.length,
            created_at: session.created_at
        });
    });

    /**
     * Get session by ID (public for Claude MCP)
     */
    getSession = asyncHandler(async (req, res) => {
        const { sessionId } = req.params;

        const session = await promptsService.getSessionById(sessionId);

        res.json({
            success: true,
            id: session.id,
            prompts: session.prompts,
            model: session.model,
            created_at: session.created_at,
            input_text: session.input_text
        });
    });

    /**
     * Get user's prompt history
     */
    getHistory = asyncHandler(async (req, res) => {
        const { limit, offset, orderBy, order } = req.query;

        const sessions = await promptsService.getUserHistory(req.user.id, {
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
            orderBy: orderBy || 'created_at',
            order: order || 'DESC'
        });

        // Get total count for pagination
        const totalCount = await promptsService.getUserSessionCount(req.user.id);

        res.json({
            success: true,
            sessions,
            pagination: {
                total: totalCount,
                limit: parseInt(limit) || 50,
                offset: parseInt(offset) || 0,
                hasMore: (parseInt(offset) || 0) + sessions.length < totalCount
            }
        });
    });

    /**
     * Get recent sessions for dashboard
     */
    getRecent = asyncHandler(async (req, res) => {
        const { limit } = req.query;

        const sessions = await promptsService.getRecentSessions(
            req.user.id,
            parseInt(limit) || 10
        );

        res.json({
            success: true,
            sessions
        });
    });

    /**
     * Search user's sessions
     */
    search = asyncHandler(async (req, res) => {
        const { q, limit, offset } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const sessions = await promptsService.searchUserSessions(req.user.id, q, {
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            query: q,
            sessions
        });
    });

    /**
     * Delete a session
     */
    deleteSession = asyncHandler(async (req, res) => {
        const { sessionId } = req.params;

        await promptsService.deleteSession(sessionId, req.user.id);

        res.json({
            success: true,
            message: 'Session deleted successfully'
        });
    });

    /**
     * Get session statistics
     */
    getStats = asyncHandler(async (req, res) => {
        const stats = await promptsService.getSessionStats(req.user.id);

        res.json({
            success: true,
            stats
        });
    });

    /**
     * Update session (for future editing features)
     */
    updateSession = asyncHandler(async (req, res) => {
        const { sessionId } = req.params;
        const { prompts, inputText } = req.body;

        const updatedSession = await promptsService.updateSession(
            sessionId,
            req.user.id,
            { prompts, inputText }
        );

        res.json({
            success: true,
            session: updatedSession
        });
    });

    /**
     * Get model statistics (admin only - add auth check if needed)
     */
    getModelStats = asyncHandler(async (req, res) => {
        // Check if user is admin
        if (!req.user.is_admin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const stats = await promptsService.getModelStats();

        res.json({
            success: true,
            stats
        });
    });
}

module.exports = new PromptsController();
