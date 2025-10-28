window.MidjourneyHandler = {
    defaultParams: {
        aspect: "4:3",   // Default aspect ratio
        stylize: "200",  // Default stylize value
        quality: "2",  // Default quality value
        speed: "relax",  // Default speed value (new)
        chaos: "25",     // Default chaos value
        weird: "0",      // Default weird value (none)
        version: "raw"   // Default style version
    },

    initMJParameters: function() {
        // Get default values from centralized config
        const defaults = window.Config ? window.Config.getUIDefaults() : {
            'aspect-ratio': '--ar 4:3',
            'stylize-value': '--stylize 200',
            'chaos-value': '--c 25',
            'speed-value': '--relax',
            'style-version': '--style raw',
            'mode-value': '--draft',
            'version-value': '--v 7',
        };

        Object.entries(defaults).forEach(([id, value]) => {
            const select = document.getElementById(id);
            if (select) {
                select.value = value;
            }
        });

        // Initialize parameter listeners and update preview
        this.setupParameterListeners();
        this.updateParameterPreview();
    },

    setupParameterListeners: function() {
        // Listen to all parameter fields
        const params = [
            'aspect-ratio', 'stylize-value', 'chaos-value', 'style-version',
            'speed-value', 'mode-value', 'version-value', 'style-weight-value',
            'no-value'
        ];
        
        // Store reference to this for proper context in callbacks
        const self = this;
        
        // Add debouncing to prevent rapid successive parameter applications
        let applyParametersTimeout = null;
        
        params.forEach(param => {
            const element = document.getElementById(param);
            if (element) {
                const eventType = element.tagName === 'INPUT' ? 'input' : 'change';
                element.addEventListener(eventType, function() {
                    logger.debug('🔧 Parameter changed:', param, 'new value:', this.value);
                    self.updateParameterPreview();
                    
                    // Debounce the parameter application to prevent multiple rapid calls
                    if (applyParametersTimeout) {
                        clearTimeout(applyParametersTimeout);
                    }
                    applyParametersTimeout = setTimeout(() => {
                        self.applyParametersToAll();
                    }, 300); // 300ms debounce
                });
            }
        });
    },

    updateParameterPreview: function() {
        const previewEl = document.getElementById('parameter-preview');
        if (!previewEl) return;

        const paramString = this.getCurrentMJParameters();
        previewEl.textContent = paramString || 'No parameters selected';
        previewEl.style.color = '#91e700';
    },

    getCurrentMJParameters: function() {
        const paramIds = [
            'aspect-ratio', 'stylize-value', 'chaos-value', 'style-version',
            'speed-value', 'mode-value', 'version-value', 'style-weight-value',
            'no-value'
        ];
        const paramArr = [];
        paramIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.value) {
                if (id === 'no-value') {
                    paramArr.push(`--no ${el.value}`);
                } else {
                    paramArr.push(el.value);
                }
            }
        });

        // Handle profiles/srefs from the selector modal
        const selectedProfiles = document.querySelectorAll('#selected-profiles-list .profile-tag');
        if (selectedProfiles) {
            selectedProfiles.forEach(tag => {
                if (tag.dataset.param) {
                    paramArr.push(tag.dataset.param);
                }
            });
        }

        const result = paramArr.filter(Boolean).join(' ');
        // Always return with a leading space if there are parameters
        return result ? ` ${result}` : '';
    },

    applyParametersToAll: function() {
        const prompts = document.querySelectorAll('textarea.prompt-text');
        
        if (prompts.length === 0) {
            logger.debug('⚠️ No prompts found to apply parameters to');
            return;
        }
        
        // Get FRESH current parameters (not cached ones)
        const paramString = this.getCurrentMJParameters();
        logger.debug('🔧 Applying parameters to', prompts.length, 'prompts:', paramString);

        let updatedCount = 0;
        prompts.forEach((promptTextarea, index) => {
            let basePrompt = promptTextarea.dataset.basePrompt;
            
            // If no basePrompt in dataset, try to extract it from current value
            if (!basePrompt) {
                const currentValue = promptTextarea.value;
                if (currentValue) {
                    // Remove /imagine prompt: prefix and any existing parameters
                    basePrompt = currentValue
                        .replace(/^\/imagine\s+prompt:\s*/i, '')
                        .replace(/\s+--[\w-]+\s+[\w:.-]+/g, '') // Remove parameter patterns like --ar 16:9
                        .replace(/\s+--[\w-]+$/g, '') // Remove parameter flags at end
                        .trim();
                    
                    // Store it for future use
                    promptTextarea.dataset.basePrompt = basePrompt;
                    logger.debug(`📝 Extracted and stored basePrompt for prompt ${index}:`, basePrompt.substring(0, 50) + '...');
                }
            }
            
            if (basePrompt) {
                // Reconstruct the full prompt with the FRESH parameters
                // Ensure proper spacing between prompt and parameters
                const cleanBasePrompt = basePrompt.trim();
                const cleanParamString = paramString.trim();
                const newValue = cleanParamString 
                    ? `/imagine prompt: ${cleanBasePrompt} ${cleanParamString}`
                    : `/imagine prompt: ${cleanBasePrompt}`;
                
                promptTextarea.value = newValue;
                updatedCount++;
                logger.debug(`✅ Updated prompt ${index}:`, newValue.substring(0, 100) + '...');
            } else {
                logger.warn(`⚠️ No basePrompt found for prompt ${index}`);
            }
        });

        // Update the green preview in real time
        this.updateParameterPreview();

        // Show toast notification
        if (window.Utils) {
            window.Utils.showToast(`Parameters updated for ${updatedCount} prompts`, 'success');
        }
        
        logger.debug(`✅ Applied parameters to ${updatedCount} of ${prompts.length} prompts`);
    },

    stripMJParameters: function(prompt) {
        // No longer needed, but kept for backward compatibility
        return prompt;
    },

    sendToDiscord: function(prompt) {
        if (!window.ipcRenderer) {
            console.error('IPC not available for Discord sending');
            return;
        }

        window.ipcRenderer.send('send-to-discord', prompt);
        window.Utils.showToast('Sending to Discord...', 'info');

        // Listen for response
        window.ipcRenderer.once('discord-send-success', () => {
            window.Utils.showToast('Sent to Discord!', 'success');
        });

        window.ipcRenderer.once('discord-send-error', (_, error) => {
            window.Utils.showToast('Error sending to Discord: ' + error, 'error');
        });
    },

    batchSendToDiscord: async function(prompts) {
        if (!window.ipcRenderer) {
            window.Utils.showToast('Discord batch sending not available', 'error');
            return;
        }

        try {
            window.ipcRenderer.send('batch-send-to-discord', { prompts });
            window.Utils.showToast(`Starting batch send of ${prompts.length} prompts...`, 'info');

        } catch (error) {
            console.error('Error in batch send:', error);
            window.Utils.showToast('Error starting batch send', 'error');
        }
    },

    sendToIdeogram: async function(prompt, isPartOfBatch = false) {
        try {
            // Simple validation - prompt should already be clean if passed from basePrompt
            let cleanPrompt = String(prompt || '').trim();
            
            // Only do minimal cleaning in case this is called with a raw prompt
            cleanPrompt = cleanPrompt.replace(/^\/imagine prompt:\s*/i, '');
            
            // Remove ALL Midjourney parameters for Ideogram
            cleanPrompt = cleanPrompt.replace(/\s+(--ar\s+[\d:]+|--stylize\s+\d+|--chaos\s+\d+|--c\s+\d+|--weird\s+\d+|--style\s+\w+|--niji\s+\d+|--turbo|--fast|--relax|--v\s+[\d\.]+|--zoom\s+[\d\.]+|--draft|--standard|--mode\s+\w+|--sw\s+\d+|--no\s+[\w\s,]+|--p\s+\w+|--sref\s+[\w\-:/.]+)/g, '').trim();
            
            if (!cleanPrompt) {
                throw new Error('Empty prompt');
            }
            
            logger.debug('🎨 Sending clean prompt to Ideogram:', cleanPrompt);
            
            // Send via HTTP API
            const result = await window.api.ideogramSubmit(cleanPrompt);
            
            if (result.success) {
                window.Utils.showToast('Prompt sent to Ideogram!', 'success');
            } else {
                throw new Error(result.error || 'Failed to submit to Ideogram');
            }
            
            // Add delay between batch items 
            if (isPartOfBatch) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error('Error sending to Ideogram:', error);
            window.Utils.showToast('Error: ' + error.message, 'error');
        }
    },

    batchSendToIdeogram: async function(prompts) {
        const cleanedPrompts = Array.isArray(prompts) ? prompts : [prompts];
        
        try {
            window.Utils.showToast(`Starting batch of ${cleanedPrompts.length} prompts to Ideogram`, 'info');
            
            // Use the batch API endpoint for better performance
            const result = await window.api.ideogramBatch(cleanedPrompts, 3000);
            
            if (result.success) {
                window.Utils.showToast('Batch processing complete!', 'success');
            } else {
                throw new Error(result.error || 'Batch processing failed');
            }
        } catch (error) {
            console.error('Error in batch send to Ideogram:', error);
            window.Utils.showToast('Batch error: ' + error.message, 'error');
        }
    }
};
