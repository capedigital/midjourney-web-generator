// Parameter UI Enhancement - Collapsible Parameters Bar
window.ParameterUI = {
    isExpanded: false,
    initialized: false,
    
    init: function() {
        if (this.initialized) return;
        
        // Check if we're on the prompt generation module
        const module = document.getElementById('prompt-generation-module');
        if (!module || module.style.display === 'none') {
            logger.debug('⏳ Prompt generation module not active yet, waiting...');
            return;
        }
        
        this.setupCollapsibleParameters();
        this.initialized = true;
        logger.debug('✅ ParameterUI initialized');
    },
    
    setupCollapsibleParameters: function() {
        const header = document.getElementById('parameters-header');
        const content = document.getElementById('parameters-content');
        const editBtn = document.getElementById('parameters-edit-btn');
        const previewCompact = document.getElementById('parameter-preview-compact');
        const previewFull = document.getElementById('parameter-preview');
        
        if (!header || !content || !editBtn) {
            logger.debug('Collapsible parameters elements not found');
            return;
        }
        
        // Update preview text AND all prompt cards
        const updatePreviewText = () => {
            const params = window.MidjourneyHandler?.getCurrentMJParameters() || 'No parameters selected';
            if (previewCompact) previewCompact.textContent = params;
            if (previewFull) previewFull.textContent = params;
            
            // Update all existing prompt cards with new parameters
            this.updateAllPromptCards(params);
        };
        
        // Initialize preview
        updatePreviewText();
        
        // Toggle function
        const toggleParameters = (expand) => {
            if (expand === undefined) {
                this.isExpanded = !this.isExpanded;
            } else {
                this.isExpanded = expand;
            }
            
            if (this.isExpanded) {
                header.classList.add('expanded');
                content.classList.add('expanded');
                editBtn.innerHTML = '<i class="fas fa-times"></i> Close';
            } else {
                header.classList.remove('expanded');
                content.classList.remove('expanded');
                editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Parameters';
            }
        };
        
        // Click handlers
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleParameters();
        });
        
        // Update preview when parameters change
        document.querySelectorAll('.param-field select, .param-field input').forEach(element => {
            element.addEventListener('change', updatePreviewText);
            element.addEventListener('input', updatePreviewText);
        });
        
        // Start collapsed
        toggleParameters(false);
        
        // Listen for platform changes to show/hide parameters
        window.addEventListener('target-platform-changed', (e) => {
            const { platform, config } = e.detail;
            const container = document.getElementById('mj-parameters');
            
            if (container && config) {
                if (config.supportsParameters) {
                    container.style.display = '';
                    logger.debug('✅ Parameters panel shown for', platform);
                } else {
                    container.style.display = 'none';
                    logger.debug('🚫 Parameters panel hidden for', platform);
                }
            }
        });
        
        // Check initial platform state
        if (window.topNavModelSelector) {
            const currentPlatform = window.topNavModelSelector.getCurrentPlatform();
            const config = window.Config?.targetModels?.[currentPlatform];
            const container = document.getElementById('mj-parameters');
            
            if (container && config) {
                if (config.supportsParameters) {
                    container.style.display = '';
                } else {
                    container.style.display = 'none';
                }
            }
        }
        
        logger.debug('✅ Collapsible parameters setup complete');
    },
    
    updateAllPromptCards: function(parameterSuffix) {
        // Update all existing prompt card textareas with new parameters
        const promptTextareas = document.querySelectorAll('#generatedPrompts .prompt-text, #prompt-container .prompt-text');
        
        promptTextareas.forEach(textarea => {
            const basePrompt = textarea.dataset.basePrompt;
            if (basePrompt) {
                // Reconstruct the full prompt with /imagine prefix and new parameters
                const fullPrompt = `/imagine prompt: ${basePrompt} ${parameterSuffix}`.replace(/\s+/g, ' ').trim();
                textarea.value = fullPrompt;
                logger.debug('Updated prompt card with new parameters:', fullPrompt.substring(0, 100) + '...');
            }
        });
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.ParameterUI.init(), 500);
    });
} else {
    setTimeout(() => window.ParameterUI.init(), 500);
}

// Re-initialize when module changes
document.addEventListener('moduleChanged', (e) => {
    if (e.detail.module === 'prompt-generation-module') {
        window.ParameterUI.initialized = false;
        setTimeout(() => window.ParameterUI.init(), 100);
    }
});

