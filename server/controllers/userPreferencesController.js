const userPreferencesService = require('../services/userPreferencesService');
const { asyncHandler } = require('../middleware/errorHandler');

class UserPreferencesController {
    /**
     * Get user's AI preferences
     */
    getPreferences = asyncHandler(async (req, res) => {
        const preferences = await userPreferencesService.getPreferences(req.user.id);
        
        res.json({
            success: true,
            preferences
        });
    });
    
    /**
     * Update user's AI model preference
     */
    updateAIModel = asyncHandler(async (req, res) => {
        const { aiModel } = req.body;
        
        if (!aiModel) {
            return res.status(400).json({
                success: false,
                error: 'AI model is required'
            });
        }
        
        const updatedModel = await userPreferencesService.updateAIModel(req.user.id, aiModel);
        
        res.json({
            success: true,
            aiModel: updatedModel
        });
    });
    
    /**
     * Update user's target platform preference
     */
    updateTargetPlatform = asyncHandler(async (req, res) => {
        const { platform } = req.body;
        
        if (!platform) {
            return res.status(400).json({
                success: false,
                error: 'Platform is required'
            });
        }
        
        const updatedPlatform = await userPreferencesService.updateTargetPlatform(req.user.id, platform);
        
        res.json({
            success: true,
            platform: updatedPlatform
        });
    });
    
    /**
     * Update both preferences at once
     */
    updatePreferences = asyncHandler(async (req, res) => {
        const { aiModel, targetPlatform } = req.body;
        
        if (!aiModel && !targetPlatform) {
            return res.status(400).json({
                success: false,
                error: 'At least one preference (aiModel or targetPlatform) is required'
            });
        }
        
        // Get current preferences first
        const current = await userPreferencesService.getPreferences(req.user.id);
        
        // Update with provided values or keep current
        const preferences = await userPreferencesService.updatePreferences(req.user.id, {
            aiModel: aiModel || current.aiModel,
            targetPlatform: targetPlatform || current.targetPlatform
        });
        
        res.json({
            success: true,
            preferences
        });
    });
}

module.exports = new UserPreferencesController();
