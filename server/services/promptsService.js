const { pool } = require('../config/database');
const { NotFoundError } = require('../middleware/errorHandler');

class PromptsService {
    /**
     * Create a new prompt session
     */
    async createSession({ userId, inputText, prompts, model }) {
        // Note: pg library automatically converts JS objects/arrays to JSONB
        // and JSONB back to JS objects/arrays - no need for JSON.stringify/parse
        
        console.log('🔍 DEBUG createSession called with:', {
            userId,
            inputText,
            prompts: prompts,
            promptsType: typeof prompts,
            isArray: Array.isArray(prompts),
            promptsLength: prompts?.length,
            firstPrompt: prompts?.[0],
            model
        });
        
        // Convert prompts array to JSON string for JSONB column
        const promptsJson = JSON.stringify(prompts);
        
        const result = await pool.query(
            `INSERT INTO prompt_sessions (user_id, input_text, prompts, model, created_at) 
             VALUES ($1, $2, $3::jsonb, $4, NOW()) 
             RETURNING id, user_id, input_text, prompts, model, created_at`,
            [userId, inputText, promptsJson, model || 'openai/gpt-4.1-mini']
        );

        const session = result.rows[0];
        // prompts is already a JS array (pg auto-parses JSONB)
        // But ensure it's an array just in case
        if (!Array.isArray(session.prompts)) {
            session.prompts = [];
        }
        
        return session;
    }

    /**
     * Get session by ID (public access for Claude)
     */
    async getSessionById(sessionId) {
        const result = await pool.query(
            `SELECT id, user_id, input_text, prompts, model, created_at 
             FROM prompt_sessions 
             WHERE id = $1`,
            [sessionId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Session not found');
        }

        const session = result.rows[0];
        
        // pg library automatically parses JSONB to JS array
        // Just ensure it's an array for safety
        if (!Array.isArray(session.prompts)) {
            console.warn(`⚠️  Prompts for session ${sessionId} is not an array, converting to empty array`);
            session.prompts = [];
        }
        
        return session;
    }

    /**
     * Get user's prompt history with pagination
     */
    async getUserHistory(userId, options = {}) {
        const {
            limit = 50,
            offset = 0,
            orderBy = 'created_at',
            order = 'DESC'
        } = options;

        // Validate orderBy to prevent SQL injection
        const validOrderBy = ['created_at', 'id'];
        const validOrder = ['ASC', 'DESC'];

        if (!validOrderBy.includes(orderBy) || !validOrder.includes(order)) {
            throw new Error('Invalid sort parameters');
        }

        const result = await pool.query(
            `SELECT id, input_text, prompts, model, created_at 
             FROM prompt_sessions 
             WHERE user_id = $1 
             ORDER BY ${orderBy} ${order} 
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        // Parse prompts for each session with error handling
        return result.rows.map(session => {
            // The prompts column is JSONB, pg library should auto-parse it
            // But we're saving as JSON string, so it might come back as string
            let prompts = session.prompts;
            
            // If it's a string, parse it
            if (typeof prompts === 'string') {
                try {
                    prompts = JSON.parse(prompts);
                } catch (e) {
                    console.error(`⚠️  Failed to parse prompts for session ${session.id}:`, e.message);
                    prompts = [];
                }
            }
            
            // Ensure it's an array
            if (!Array.isArray(prompts)) {
                console.warn(`⚠️  Prompts for session ${session.id} is not an array, converting to empty array`);
                prompts = [];
            }
            
            return {
                ...session,
                prompts
            };
        });
    }

    /**
     * Get total session count for user
     */
    async getUserSessionCount(userId) {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM prompt_sessions WHERE user_id = $1',
            [userId]
        );

        return parseInt(result.rows[0].count);
    }

    /**
     * Search user's sessions by text
     */
    async searchUserSessions(userId, searchText, options = {}) {
        const { limit = 50, offset = 0 } = options;

        const result = await pool.query(
            `SELECT id, input_text, prompts, model, created_at 
             FROM prompt_sessions 
             WHERE user_id = $1 
             AND (
                 input_text ILIKE $2 
                 OR prompts::text ILIKE $2
             )
             ORDER BY created_at DESC 
             LIMIT $3 OFFSET $4`,
            [userId, `%${searchText}%`, limit, offset]
        );

        return result.rows.map(session => {
            // pg library automatically parses JSONB to JS array
            // Just ensure it's an array for safety
            if (!Array.isArray(session.prompts)) {
                console.warn(`⚠️  Prompts for session ${session.id} is not an array`);
                return {
                    ...session,
                    prompts: []
                };
            }
            return session;
        });
    }

    /**
     * Delete a session (user can only delete their own)
     */
    async deleteSession(sessionId, userId) {
        const result = await pool.query(
            'DELETE FROM prompt_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
            [sessionId, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Session not found or access denied');
        }

        return true;
    }

    /**
     * Get recent sessions (for dashboard)
     */
    async getRecentSessions(userId, limit = 10) {
        const result = await pool.query(
            `SELECT id, input_text, prompts, model, created_at
             FROM prompt_sessions 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2`,
            [userId, limit]
        );

        // Parse JSONB prompts for each session
        return result.rows.map(session => {
            // The prompts column is JSONB, but we save as JSON string
            let prompts = session.prompts;
            
            // If it's a string, parse it
            if (typeof prompts === 'string') {
                try {
                    prompts = JSON.parse(prompts);
                } catch (e) {
                    console.error(`⚠️  Failed to parse prompts for session ${session.id}:`, e.message);
                    prompts = [];
                }
            }
            
            // Ensure it's an array
            if (!Array.isArray(prompts)) {
                prompts = [];
            }
            
            return {
                ...session,
                prompts
            };
        });
    }

    /**
     * Get session statistics for a user
     */
    async getSessionStats(userId) {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_sessions,
                COUNT(DISTINCT DATE(created_at)) as days_active,
                MIN(created_at) as first_session,
                MAX(created_at) as last_session,
                COUNT(DISTINCT model) as models_used
             FROM prompt_sessions 
             WHERE user_id = $1`,
            [userId]
        );

        return result.rows[0];
    }

    /**
     * Update session (for future features like editing)
     */
    async updateSession(sessionId, userId, updates) {
        const { prompts, inputText } = updates;
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        if (prompts) {
            updateFields.push(`prompts = $${paramIndex++}`);
            values.push(JSON.stringify(prompts));
        }

        if (inputText) {
            updateFields.push(`input_text = $${paramIndex++}`);
            values.push(inputText);
        }

        if (updateFields.length === 0) {
            return await this.getSessionById(sessionId);
        }

        values.push(sessionId, userId);

        const result = await pool.query(
            `UPDATE prompt_sessions 
             SET ${updateFields.join(', ')} 
             WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
             RETURNING id, input_text, prompts, model, created_at`,
            values
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Session not found or access denied');
        }

        const session = result.rows[0];
        session.prompts = JSON.parse(session.prompts);
        
        return session;
    }

    /**
     * Get popular models (admin/stats)
     */
    async getModelStats() {
        const result = await pool.query(
            `SELECT 
                model, 
                COUNT(*) as usage_count,
                COUNT(DISTINCT user_id) as unique_users
             FROM prompt_sessions 
             GROUP BY model 
             ORDER BY usage_count DESC`
        );

        return result.rows;
    }
}

module.exports = new PromptsService();
