/**
 * Global AI Model Selector
 * Synchronized across the entire application with live pricing
 */

class GlobalModelSelector {
    constructor() {
        this.models = [];
        this.selectedModel = null;
        this.credits = null;
        this.selectors = [];
        this.updateCallbacks = [];
        
        this.init();
    }
    
    async init() {
        // Load selected model from localStorage
        const saved = localStorage.getItem('selected-ai-model');
        if (saved) {
            try {
                this.selectedModel = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse saved model:', e);
            }
        }
        
        // Load models from API
        await this.loadModels();
        
        // Try to load credits
        await this.loadCredits();
        
        // Set up periodic refresh (every hour)
        setInterval(() => this.loadModels(), 3600000);
        
        // Set up credit refresh (every 5 minutes if available)
        if (this.credits && this.credits.available) {
            setInterval(() => this.loadCredits(), 300000);
        }
    }
    
    async loadModels() {
        try {
            const response = await fetch('/api/openrouter/models/top');
            const data = await response.json();
            
            if (data.success) {
                this.models = data.models;
                console.log(`✅ Loaded ${this.models.length} AI models with pricing`);
                
                // If no model selected, select the cheapest one
                if (!this.selectedModel && this.models.length > 0) {
                    this.selectModel(this.models[0]);
                }
                
                // Update all existing selectors
                this.renderAllSelectors();
            }
        } catch (error) {
            console.error('❌ Failed to load AI models:', error);
        }
    }
    
    async loadCredits() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const response = await fetch('/api/openrouter/credits', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.available) {
                this.credits = data.credits;
                console.log('✅ Loaded OpenRouter credits:', this.credits);
                this.renderAllCredits();
            }
        } catch (error) {
            console.error('❌ Failed to load credits:', error);
        }
    }
    
    /**
     * Select a model and notify all callbacks
     */
    selectModel(model) {
        this.selectedModel = model;
        localStorage.setItem('selected-ai-model', JSON.stringify(model));
        
        // Notify all callbacks
        this.updateCallbacks.forEach(callback => {
            try {
                callback(model);
            } catch (e) {
                console.error('Callback error:', e);
            }
        });
        
        // Update all selectors
        this.renderAllSelectors();
        
        console.log('✅ Selected model:', model.name, `($${model.pricing.avgCostPer1M}/1M tokens)`);
    }
    
    /**
     * Register a callback for model changes
     */
    onModelChange(callback) {
        this.updateCallbacks.push(callback);
        
        // Call immediately with current model if one is selected
        if (this.selectedModel) {
            callback(this.selectedModel);
        }
    }
    
    /**
     * Create a model selector element
     */
    createSelector(options = {}) {
        const {
            id = `model-selector-${Date.now()}`,
            label = 'AI Model',
            showPrice = true,
            showCredits = false,
            className = ''
        } = options;
        
        const container = document.createElement('div');
        container.className = `global-model-selector ${className}`;
        container.id = id;
        
        const html = `
            <div class="model-selector-label">
                <label for="${id}-select">
                    <i class="fas fa-robot"></i> ${label}
                </label>
                ${showCredits && this.credits ? `
                    <div class="credits-display">
                        <i class="fas fa-coins"></i>
                        <span id="${id}-credits">Loading...</span>
                    </div>
                ` : ''}
            </div>
            <select id="${id}-select" class="model-select">
                <option value="">Loading models...</option>
            </select>
            ${showPrice ? `
                <div class="model-pricing">
                    <i class="fas fa-tag"></i>
                    <span id="${id}-price">Select a model</span>
                </div>
            ` : ''}
        `;
        
        container.innerHTML = html;
        
        // Store reference
        this.selectors.push({
            container,
            id,
            select: null, // Will be set after inserting into DOM
            showPrice,
            showCredits
        });
        
        return container;
    }
    
    /**
     * Render a specific selector
     */
    renderSelector(selectorObj) {
        const select = document.getElementById(`${selectorObj.id}-select`);
        if (!select) return;
        
        // Store reference
        selectorObj.select = select;
        
        // Clear existing options
        select.innerHTML = '';
        
        if (this.models.length === 0) {
            select.innerHTML = '<option value="">Loading models...</option>';
            return;
        }
        
        // Add models as options
        this.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} - $${model.pricing.avgCostPer1M}/1M`;
            option.dataset.model = JSON.stringify(model);
            
            if (this.selectedModel && model.id === this.selectedModel.id) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
        
        // Add change listener
        select.addEventListener('change', (e) => {
            const selectedOption = e.target.selectedOptions[0];
            if (selectedOption && selectedOption.dataset.model) {
                const model = JSON.parse(selectedOption.dataset.model);
                this.selectModel(model);
            }
        });
        
        // Update price display if enabled
        if (selectorObj.showPrice) {
            this.updatePriceDisplay(selectorObj.id);
        }
        
        // Update credits display if enabled
        if (selectorObj.showCredits) {
            this.updateCreditsDisplay(selectorObj.id);
        }
    }
    
    /**
     * Render all selectors
     */
    renderAllSelectors() {
        this.selectors.forEach(selector => this.renderSelector(selector));
    }
    
    /**
     * Update price display for a selector
     */
    updatePriceDisplay(selectorId) {
        const priceEl = document.getElementById(`${selectorId}-price`);
        if (!priceEl) return;
        
        if (this.selectedModel) {
            const p = this.selectedModel.pricing;
            priceEl.innerHTML = `
                <strong>$${p.avgCostPer1M}/1M tokens</strong>
                <small>(Input: $${p.promptPer1M}/1M · Output: $${p.completionPer1M}/1M)</small>
            `;
        } else {
            priceEl.textContent = 'Select a model';
        }
    }
    
    /**
     * Update credits display for a selector
     */
    updateCreditsDisplay(selectorId) {
        const creditsEl = document.getElementById(`${selectorId}-credits`);
        if (!creditsEl) return;
        
        if (this.credits && this.credits.balance !== undefined) {
            creditsEl.textContent = `$${this.credits.balance.toFixed(2)}`;
        } else {
            creditsEl.textContent = 'N/A';
        }
    }
    
    /**
     * Render all credit displays
     */
    renderAllCredits() {
        this.selectors.forEach(selector => {
            if (selector.showCredits) {
                this.updateCreditsDisplay(selector.id);
            }
        });
    }
    
    /**
     * Get current selected model
     */
    getSelectedModel() {
        return this.selectedModel;
    }
    
    /**
     * Get model by ID
     */
    getModelById(id) {
        return this.models.find(m => m.id === id);
    }
}

// Create global instance
window.globalModelSelector = new GlobalModelSelector();

// Helper function to easily create selectors
window.createModelSelector = function(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return null;
    }
    
    const selector = window.globalModelSelector.createSelector(options);
    container.appendChild(selector);
    
    // Render immediately
    setTimeout(() => {
        window.globalModelSelector.renderSelector(
            window.globalModelSelector.selectors[window.globalModelSelector.selectors.length - 1]
        );
    }, 100);
    
    return selector;
};

// Update existing model selectors to use global selector
document.addEventListener('DOMContentLoaded', () => {
    // Find existing AI model selectors and sync them
    const existingSelectors = document.querySelectorAll('#ai-model, [name="ai-model"]');
    
    existingSelectors.forEach(select => {
        // Listen for changes and update global state
        select.addEventListener('change', (e) => {
            const modelId = e.target.value;
            const model = window.globalModelSelector.getModelById(modelId);
            if (model) {
                window.globalModelSelector.selectModel(model);
            }
        });
        
        // Update this selector when global state changes
        window.globalModelSelector.onModelChange((model) => {
            if (select.value !== model.id) {
                select.value = model.id;
                
                // Trigger change event for any listeners
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
            }
        });
    });
});
