/**
 * Global Model Synchronization System
 * Keeps all AI model dropdowns in sync across the application
 */

// Default AI model
const DEFAULT_AI_MODEL = 'openai/gpt-4.1-nano';

// Initialize global model synchronization when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeGlobalModelSync();
});

function initializeGlobalModelSync() {
    // Get all model selector dropdowns
    const selectors = {
        dashboard: document.getElementById('ai-model-selector'),
        template: document.getElementById('template-ai-model'),
        chat: document.getElementById('chat-ai-model')
    };

    // Remove null selectors
    Object.keys(selectors).forEach(key => {
        if (!selectors[key]) delete selectors[key];
    });

    if (Object.keys(selectors).length === 0) {
        console.log('No model selectors found for sync');
        return;
    }

    // Get saved model preference or default to our preferred model
    const savedModel = localStorage.getItem('global-ai-model');
    let currentModel = savedModel;

    // If no saved model or saved model not available, use our default
    if (!currentModel || !validateModelExists(currentModel, selectors)) {
        // First try our preferred default
        if (validateModelExists(DEFAULT_AI_MODEL, selectors)) {
            currentModel = DEFAULT_AI_MODEL;
            // Save the default so it persists
            localStorage.setItem('global-ai-model', currentModel);
        } else {
            // Fall back to first available option
            currentModel = Object.values(selectors)[0].value;
        }
        console.log('Using default AI model:', currentModel);
    }

    // Set all dropdowns to the current model
    syncAllDropdowns(selectors, currentModel);

    // Add event listeners to all dropdowns
    Object.entries(selectors).forEach(([name, selector]) => {
        selector.addEventListener('change', function(e) {
            const newModel = e.target.value;
            console.log(`${name} dropdown changed to:`, newModel);
            
            // Save preference
            localStorage.setItem('global-ai-model', newModel);
            
            // Sync all other dropdowns
            syncAllDropdowns(selectors, newModel, name);
            
            // Update global manager if it exists (for AI Chat)
            if (window.globalModelManager) {
                window.globalModelManager.currentModel = newModel;
                // Don't call setModel here to avoid circular updates
            }
        });
    });

    console.log('Global model sync initialized with model:', currentModel);
}

function validateModelExists(model, selectors) {
    // Check if the model exists in at least one dropdown
    return Object.values(selectors).some(selector => {
        return selector.querySelector(`option[value="${model}"]`);
    });
}

function syncAllDropdowns(selectors, model, excludeSelector = null) {
    Object.entries(selectors).forEach(([name, selector]) => {
        // Skip the selector that triggered the change
        if (name === excludeSelector) return;
        
        // Check if this dropdown has the model option
        const option = selector.querySelector(`option[value="${model}"]`);
        if (option && selector.value !== model) {
            selector.value = model;
            console.log(`Synced ${name} dropdown to:`, model);
        }
    });
}

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeGlobalModelSync };
}

// Global function to reset to default model (for debugging/manual override)
window.resetToDefaultModel = function() {
    localStorage.setItem('global-ai-model', DEFAULT_AI_MODEL);
    location.reload(); // Reload to apply changes
    console.log('Reset to default model:', DEFAULT_AI_MODEL);
};
