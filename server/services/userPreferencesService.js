const db = require('../config/database');

class UserPreferencesService {
    /**
     * Get user's AI preferences
     */
    async getPreferences(userId) {
        const result = await db.query(
            'SELECT preferred_ai_model, target_platform FROM users WHERE id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        
        return {
            aiModel: result.rows[0].preferred_ai_model || 'openai/gpt-4o-mini',
            targetPlatform: result.rows[0].target_platform || 'midjourney'
        };
    }
    
    /**
     * Update user's AI model preference
     */
    async updateAIModel(userId, aiModel) {
        const result = await db.query(
            'UPDATE users SET preferred_ai_model = $1 WHERE id = $2 RETURNING preferred_ai_model',
            [aiModel, userId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        
        return result.rows[0].preferred_ai_model;
    }
    
    /**
     * Update user's target platform preference
     */
    async updateTargetPlatform(userId, platform) {
        const result = await db.query(
            'UPDATE users SET target_platform = $1 WHERE id = $2 RETURNING target_platform',
            [platform, userId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        
        return result.rows[0].target_platform;
    }
    
    /**
     * Update both preferences at once
     */
    async updatePreferences(userId, preferences) {
        const { aiModel, targetPlatform } = preferences;
        
        const result = await db.query(
            'UPDATE users SET preferred_ai_model = $1, target_platform = $2 WHERE id = $3 RETURNING preferred_ai_model, target_platform',
            [aiModel, targetPlatform, userId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        
        return {
            aiModel: result.rows[0].preferred_ai_model,
            targetPlatform: result.rows[0].target_platform
        };
    }
}

module.exports = new UserPreferencesService();
