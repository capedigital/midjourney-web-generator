/**
 * AI Configuration Manager
 * Centralized control for AI Engine (OpenRouter) and Target Platform selection
 */

window.AIConfigManager = {
    // Current selections
    currentAIModel: null,
    currentPlatform: 'midjourney', // Default
    
    // Available AI models (from TopNavModelSelector)
    aiModels: [
        {
            id: 'openai/gpt-4o-mini',
            name: 'GPT-4o Mini',
            icon: '⚡',
            description: 'Fast, accurate, cost-effective',
            provider: 'OpenAI'
        },
        {
            id: 'anthropic/claude-3.5-sonnet',
            name: 'Claude 3.5 Sonnet',
            icon: '🎭',
            description: 'Nuanced, creative, thoughtful',
            provider: 'Anthropic'
        },
        {
            id: 'google/gemini-2.0-flash-001',
            name: 'Gemini 2.0 Flash',
            icon: '💎',
            description: 'Google\'s latest multimodal AI',
            provider: 'Google'
        }
    ],
    
    /**
     * Initialize the AI Config Manager
     */
    init() {
        logger.debug('🤖 AI Config Manager initializing...');
        
        // Load saved preferences
        this.loadPreferences();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Render AI engines
        this.renderAIEngines();
        
        // Mark current platform as selected
        this.updatePlatformSelection();
        
        logger.debug('✅ AI Config Manager initialized', {
            aiModel: this.currentAIModel,
            platform: this.currentPlatform
        });
    },
    
    /**
     * Load saved preferences from localStorage
     */
    loadPreferences() {
        const savedModel = localStorage.getItem('ai_config_model');
        const savedPlatform = localStorage.getItem('ai_config_platform');
        
        if (savedModel) {
            this.currentAIModel = savedModel;
        } else {
            // Get from global model sync if available
            if (window.globalModelSync) {
                const model = window.globalModelSync.getCurrentModel();
                this.currentAIModel = model ? model.id : 'openai/gpt-4o-mini';
            } else {
                this.currentAIModel = 'openai/gpt-4o-mini';
            }
        }
        
        if (savedPlatform) {
            this.currentPlatform = savedPlatform;
        }
    },
    
    /**
     * Save preferences to localStorage
     */
    savePreferences() {
        localStorage.setItem('ai_config_model', this.currentAIModel);
        localStorage.setItem('ai_config_platform', this.currentPlatform);
        
        logger.debug('💾 AI Config preferences saved', {
            model: this.currentAIModel,
            platform: this.currentPlatform
        });
    },
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Open modal
        const openBtn = document.getElementById('ai-config-btn');
        if (openBtn) {
            openBtn.addEventListener('click', () => this.openModal());
        }
        
        // Close modal
        const closeBtn = document.getElementById('ai-config-close');
        const cancelBtn = document.getElementById('ai-config-cancel');
        const overlay = document.querySelector('.ai-config-overlay');
        
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
        if (overlay) overlay.addEventListener('click', () => this.closeModal());
        
        // Save configuration
        const saveBtn = document.getElementById('ai-config-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveConfiguration());
        }
        
        // Platform selection
        const platformOptions = document.querySelectorAll('.platform-option');
        platformOptions.forEach(option => {
            option.addEventListener('click', () => {
                const platform = option.dataset.platform;
                this.selectPlatform(platform);
            });
        });
    },
    
    /**
     * Render AI engine options
     */
    renderAIEngines() {
        const container = document.getElementById('ai-engine-selector');
        if (!container) return;
        
        container.innerHTML = this.aiModels.map(model => `
            <div class="platform-option ai-model-option ${this.currentAIModel === model.id ? 'selected' : ''}" 
                 data-model="${model.id}">
                <div class="platform-icon">${model.icon}</div>
                <div class="platform-info">
                    <h4>${model.name}</h4>
                    <p>${model.description}</p>
                    <div class="platform-features">
                        <span class="feature-badge">${model.provider}</span>
                    </div>
                </div>
                <div class="platform-check">
                    <i class="fas fa-check-circle"></i>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        container.querySelectorAll('.ai-model-option').forEach(option => {
            option.addEventListener('click', () => {
                const modelId = option.dataset.model;
                this.selectAIModel(modelId);
            });
        });
    },
    
    /**
     * Select an AI model
     */
    selectAIModel(modelId) {
        this.currentAIModel = modelId;
        
        // Update UI
        document.querySelectorAll('.ai-model-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.model === modelId);
        });
        
        logger.debug('🎯 AI Model selected:', modelId);
    },
    
    /**
     * Select a platform
     */
    selectPlatform(platform) {
        this.currentPlatform = platform;
        this.updatePlatformSelection();
        
        logger.debug('🎯 Platform selected:', platform);
    },
    
    /**
     * Update platform selection UI
     */
    updatePlatformSelection() {
        document.querySelectorAll('.platform-option[data-platform]').forEach(option => {
            option.classList.toggle('selected', option.dataset.platform === this.currentPlatform);
        });
    },
    
    /**
     * Open the modal
     */
    openModal() {
        const modal = document.getElementById('ai-config-modal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Refresh current selections
            this.renderAIEngines();
            this.updatePlatformSelection();
        }
    },
    
    /**
     * Close the modal
     */
    closeModal() {
        const modal = document.getElementById('ai-config-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Save configuration and apply changes
     */
    saveConfiguration() {
        // Save to localStorage
        this.savePreferences();
        
        // Sync with global model selector
        if (window.globalModelSync) {
            const model = this.aiModels.find(m => m.id === this.currentAIModel);
            if (model) {
                window.globalModelSync.setModel(model.id);
            }
        }
        
        // Update top nav display
        if (window.topNavModelSelector) {
            window.topNavModelSelector.updateDisplay();
        }
        
        // Apply platform-specific changes
        this.applyPlatformConfiguration();
        
        // Show success message
        if (window.Utils) {
            window.Utils.showToast('✅ AI Configuration saved!', 'success');
        }
        
        // Close modal
        this.closeModal();
        
        logger.debug('✅ Configuration applied', {
            aiModel: this.currentAIModel,
            platform: this.currentPlatform
        });
    },
    
    /**
     * Apply platform-specific configuration changes
     */
    applyPlatformConfiguration() {
        const config = window.Config.targetModels[this.currentPlatform];
        if (!config) {
            logger.warn('Unknown platform:', this.currentPlatform);
            return;
        }
        
        logger.debug('🎨 Applying platform configuration:', config);
        
        // Update parameter visibility based on platform
        const parameterPanel = document.getElementById('mj-parameters');
        if (parameterPanel) {
            if (config.supportsParameters) {
                parameterPanel.style.display = '';
                logger.debug('✅ Parameters panel shown (Midjourney)');
            } else {
                parameterPanel.style.display = 'none';
                logger.debug('🚫 Parameters panel hidden (non-Midjourney)');
            }
        }
        
        // Update Template Builder target model selector
        const targetModelSelect = document.getElementById('target-model');
        if (targetModelSelect) {
            targetModelSelect.value = this.currentPlatform;
            // Trigger change event to update preview
            targetModelSelect.dispatchEvent(new Event('change'));
        }
        
        // Dispatch custom event for other modules to listen to
        window.dispatchEvent(new CustomEvent('ai-config-changed', {
            detail: {
                aiModel: this.currentAIModel,
                platform: this.currentPlatform,
                platformConfig: config
            }
        }));
    },
    
    /**
     * Get current AI model
     */
    getCurrentAIModel() {
        return this.currentAIModel;
    },
    
    /**
     * Get current platform
     */
    getCurrentPlatform() {
        return this.currentPlatform;
    },
    
    /**
     * Get platform configuration
     */
    getPlatformConfig() {
        return window.Config.targetModels[this.currentPlatform];
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.AIConfigManager.init();
        }, 500); // Wait for other modules to load
    });
} else {
    setTimeout(() => {
        window.AIConfigManager.init();
    }, 500);
}
