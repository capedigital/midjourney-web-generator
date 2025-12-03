const pool = require('../config/database');

/**
 * Chat Sessions Service
 * Handles database operations for AI chat session history
 */

class ChatSessionsService {
    /**
     * Save or update a chat session
     */
    async saveSession(userId, sessionId, title, messages, model) {
        const query = `
            INSERT INTO ai_chat_sessions (user_id, session_id, title, messages, model)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (session_id)
            DO UPDATE SET
                title = EXCLUDED.title,
                messages = EXCLUDED.messages,
                model = EXCLUDED.model,
                updated_at = NOW()
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            userId,
            sessionId,
            title,
            JSON.stringify(messages),
            model
        ]);
        
        return result.rows[0];
    }

    /**
     * Get all sessions for a user
     */
    async getUserSessions(userId, limit = 100) {
        const query = `
            SELECT id, session_id, title, model, created_at, updated_at,
                   jsonb_array_length(messages) as message_count
            FROM ai_chat_sessions
            WHERE user_id = $1
            ORDER BY updated_at DESC
            LIMIT $2
        `;
        
        const result = await pool.query(query, [userId, limit]);
        return result.rows;
    }

    /**
     * Get a specific session by session_id
     */
    async getSession(userId, sessionId) {
        const query = `
            SELECT * FROM ai_chat_sessions
            WHERE user_id = $1 AND session_id = $2
        `;
        
        const result = await pool.query(query, [userId, sessionId]);
        return result.rows[0];
    }

    /**
     * Delete a session
     */
    async deleteSession(userId, sessionId) {
        const query = `
            DELETE FROM ai_chat_sessions
            WHERE user_id = $1 AND session_id = $2
            RETURNING session_id
        `;
        
        const result = await pool.query(query, [userId, sessionId]);
        return result.rowCount > 0;
    }

    /**
     * Delete old sessions (cleanup)
     */
    async deleteOldSessions(userId, keepCount = 250) {
        const query = `
            DELETE FROM ai_chat_sessions
            WHERE user_id = $1
            AND id NOT IN (
                SELECT id FROM ai_chat_sessions
                WHERE user_id = $1
                ORDER BY updated_at DESC
                LIMIT $2
            )
        `;
        
        const result = await pool.query(query, [userId, keepCount]);
        return result.rowCount;
    }

    /**
     * Search sessions by keywords in title or messages
     * Returns relevant snippets for context injection
     */
    async searchSessionsForContext(userId, keywords, limit = 5) {
        // Simple keyword search using ILIKE for PostgreSQL
        // In production, you'd use full-text search or vector embeddings
        const searchPattern = `%${keywords.join('%')}%`;
        
        const query = `
            SELECT 
                session_id,
                title,
                messages,
                created_at,
                CASE 
                    WHEN title ILIKE $2 THEN 3
                    WHEN messages::text ILIKE $2 THEN 2
                    ELSE 1
                END as relevance
            FROM ai_chat_sessions
            WHERE user_id = $1
            AND (
                title ILIKE $2 
                OR messages::text ILIKE $2
            )
            ORDER BY relevance DESC, updated_at DESC
            LIMIT $3
        `;
        
        const result = await pool.query(query, [userId, searchPattern, limit]);
        return result.rows;
    }

    /**
     * Get recent sessions for context (fallback if no keyword matches)
     */
    async getRecentSessionsForContext(userId, excludeSessionId, limit = 3) {
        const query = `
            SELECT 
                session_id,
                title,
                messages,
                created_at
            FROM ai_chat_sessions
            WHERE user_id = $1
            AND session_id != $2
            ORDER BY updated_at DESC
            LIMIT $3
        `;
        
        const result = await pool.query(query, [userId, excludeSessionId, limit]);
        return result.rows;
    }
}

module.exports = new ChatSessionsService();
