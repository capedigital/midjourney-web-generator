/**
 * Global Model Synchronization System
 * Bridges between TopNavModelSelector and other components
 */

// Default AI model (fallback if nothing is available)
const DEFAULT_AI_MODEL = 'google/gemini-2.0-flash-001';

// Create global model sync object that other modules can use
window.globalModelSync = {
    subscribers: [],
    
    getCurrentModel() {
        // ONLY get from TopNavModelSelector - NO localStorage
        if (window.topNavModelSelector && window.topNavModelSelector.currentModel) {
            return {
                id: window.topNavModelSelector.currentModel.id,
                name: window.topNavModelSelector.currentModel.name
            };
        }
        
        // Final fallback if top nav not initialized yet
        return { id: DEFAULT_AI_MODEL, name: DEFAULT_AI_MODEL };
    },
    
    updateModel(modelId) {
        // Just notify subscribers - NO localStorage
        this.notifySubscribers(modelId);
    },
    
    subscribe(callback) {
        if (typeof callback === 'function') {
            this.subscribers.push(callback);
        }
    },
    
    notifySubscribers(modelId) {
        this.subscribers.forEach(callback => {
            try {
                callback(modelId);
            } catch (error) {
                console.error('Error in globalModelSync subscriber:', error);
            }
        });
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ globalModelSync initialized');
});

// Global function to reset to default model (for debugging/manual override)
window.resetToDefaultModel = function() {
    localStorage.setItem('selected-ai-model', DEFAULT_AI_MODEL);
    if (window.topNavModelSelector) {
        window.topNavModelSelector.setModel(DEFAULT_AI_MODEL);
    }
    console.log('Reset to default model:', DEFAULT_AI_MODEL);
};
