window.Generator = {
    generatePrompts: function(inputText, elements) {
        logger.debug('Generating prompts from:', inputText);
        // Parse the prompts into a clean array (same as generateWithChatGPT)
        const prompts = this.parseGeneratedPrompts(inputText);
        // Display the prompts properly (same as generateWithChatGPT)
        this.displayGeneratedPrompts(prompts);
    },



    displayGeneratedPrompts: function(cleanPrompts) {
        const container = document.getElementById('generatedPrompts') || document.getElementById('prompt-container');
        if (!container) {
            console.error('❌ No prompt container found! Looking for #generatedPrompts or #prompt-container');
            return;
        }
        
        container.innerHTML = '';

        // Get the current parameter string ONCE after ensuring it's fresh.
        const parameterSuffix = window.MidjourneyHandler.getCurrentMJParameters();
        logger.debug('Using parameter suffix:', parameterSuffix);

        // Create prompts
        cleanPrompts.forEach((basePrompt, index) => {
            const promptDiv = document.createElement('div');
            promptDiv.className = 'prompt-item';

            // Store the clean base prompt WITHOUT any /imagine prefix or parameters
            const cleanBasePrompt = basePrompt.replace(/^\/imagine\s+prompt:\s*/i, '').trim();

            // Construct the full prompt text for display with current parameters
            const fullPrompt = `/imagine prompt: ${cleanBasePrompt} ${parameterSuffix}`.replace(/\s+/g, ' ').trim();

            let browserMode = 'external';
            if (window.getCurrentBrowserMode) {
                browserMode = window.getCurrentBrowserMode();
            }
            
            // Create visual indicators for browser mode
            const isInternal = browserMode === 'internal';
            const modeIcon = isInternal ? '🌐' : '🚀';
            const modeColor = isInternal ? '#4CAF50' : '#FF9800';
            const modeTooltip = isInternal ? 'Opens in app webview' : 'Opens in external browser';
            
            promptDiv.innerHTML = `
                <div class="prompt-header">
                    <span class="prompt-title">Prompt ${index + 1}</span>
                    <div class="prompt-actions">
                        <button class="copy-prompt">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button class="edit-prompt">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-prompt">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <button class="send-discord-btn" title="Send to Discord/Midjourney">
                            <i class="fab fa-discord"></i> Send
                        </button>
                        <button class="ideogram-btn ${isInternal ? 'send-btn-internal' : 'send-btn-external'}" title="${modeTooltip}">
                            <i class="${isInternal ? 'fas fa-desktop' : 'fas fa-external-link-alt'}"></i> Ideogram
                        </button>
                        <button class="midjourney-btn ${isInternal ? 'send-btn-internal' : 'send-btn-external'}" title="${modeTooltip}">
                            <i class="${isInternal ? 'fas fa-desktop' : 'fas fa-external-link-alt'}"></i> Midjourney
                        </button>
                    </div>
                </div>
                <textarea class="prompt-text">${fullPrompt}</textarea>
            `;
            container.appendChild(promptDiv);

            // CRITICAL: Store the CLEAN base prompt without /imagine prefix or parameters
            const textarea = promptDiv.querySelector('.prompt-text');
            if (textarea) {
                logger.debug('Storing clean basePrompt:', cleanBasePrompt);
                textarea.dataset.basePrompt = cleanBasePrompt;
                logger.debug('Stored dataset.basePrompt:', textarea.dataset.basePrompt);
            }
        });

        // Setup handlers
        this.setupPromptActionHandlers();
        
        // Update all button styling to match current browser mode
        if (window.updateAllButtonsSimple) {
            window.updateAllButtonsSimple();
        }
        
        // Scroll into view
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    setupPromptActionHandlers: function() {
        logger.debug('🔧 Setting up prompt action handlers...');
        
        const copyButtons = document.querySelectorAll('.copy-prompt');
        const editButtons = document.querySelectorAll('.edit-prompt');
        const deleteButtons = document.querySelectorAll('.delete-prompt');
        const ideogramButtons = document.querySelectorAll('.ideogram-btn');
        const midjourneyButtons = document.querySelectorAll('.midjourney-btn');
        
        logger.debug(`Found buttons - Copy: ${copyButtons.length}, Edit: ${editButtons.length}, Delete: ${deleteButtons.length}, Ideogram: ${ideogramButtons.length}, Midjourney: ${midjourneyButtons.length}`);
        
        // Individual prompt handlers
        document.querySelectorAll('.copy-prompt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const promptDiv = e.target.closest('.prompt-item');
                if (!promptDiv) return;
                const textarea = promptDiv.querySelector('.prompt-text');
                if (textarea) {
                    navigator.clipboard.writeText(textarea.value);
                    window.Utils.showToast('Prompt copied!', 'success');
                }
            });
        });

        // Edit button handlers
        document.querySelectorAll('.edit-prompt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const promptDiv = e.target.closest('.prompt-item');
                if (!promptDiv) return;
                const textarea = promptDiv.querySelector('.prompt-text');
                if (textarea) {
                    textarea.focus();
                    textarea.select();
                }
            });
        });

        // Delete button handlers
        document.querySelectorAll('.delete-prompt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const promptDiv = e.target.closest('.prompt-item');
                if (promptDiv && confirm('Delete this prompt?')) {
                    promptDiv.remove();
                }
            });
        });

        // Discord send button handlers
        document.querySelectorAll('.send-discord-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const promptDiv = e.target.closest('.prompt-item');
                if (!promptDiv) return;
                const textarea = promptDiv.querySelector('.prompt-text');
                if (!textarea) return;

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

                try {
                    const response = await fetch('/api/discord/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ 
                            prompt: textarea.value 
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        window.Utils.showToast('✅ Sent to Discord successfully!', 'success');
                        btn.innerHTML = '<i class="fas fa-check"></i> Sent!';
                        setTimeout(() => {
                            btn.innerHTML = '<i class="fab fa-discord"></i> Send to Discord';
                            btn.disabled = false;
                        }, 3000);
                    } else {
                        window.Utils.showToast(`❌ ${data.error || 'Failed to send to Discord'}`, 'error');
                        btn.innerHTML = '<i class="fab fa-discord"></i> Send to Discord';
                        btn.disabled = false;
                    }
                } catch (error) {
                    logger.error('Discord send failed:', error);
                    window.Utils.showToast('❌ Network error: ' + error.message, 'error');
                    btn.innerHTML = '<i class="fab fa-discord"></i> Send to Discord';
                    btn.disabled = false;
                }
            });
        });

        document.querySelectorAll('.ideogram-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const promptDiv = e.target.closest('.prompt-item');
                if (!promptDiv) return;
                const textarea = promptDiv.querySelector('.prompt-text');
                if (textarea) {
                    btn.disabled = true;
                    let browserMode = 'external';
                    if (window.getCurrentBrowserMode) {
                        browserMode = window.getCurrentBrowserMode();
                    }
                    
                    // Use consistent loading state
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                    
                    // Get the clean basePrompt instead of the full textarea value
                    const cleanPrompt = textarea.dataset.basePrompt || textarea.value;
                    logger.debug('🎨 Using clean basePrompt for Ideogram:', cleanPrompt);
                    // Always use global browser setting for Ideogram
                    window.sendPromptWithGlobalSetting(cleanPrompt, 'ideogram');
                    // Re-enable button after delay
                    setTimeout(() => {
                        btn.disabled = false;
                        let browserMode = 'external';
                        if (window.getCurrentBrowserMode) {
                            browserMode = window.getCurrentBrowserMode();
                        }
                        
                        // Restore consistent styling
                        const isInternal = browserMode === 'internal';
                        const modeTooltip = isInternal ? 'Opens in app webview' : 'Opens in external browser';
                        
                        btn.className = `ideogram-btn ${isInternal ? 'send-btn-internal' : 'send-btn-external'}`;
                        btn.innerHTML = `${isInternal ? '<i class="fas fa-desktop"></i>' : '<i class="fas fa-external-link-alt"></i>'} Ideogram ${isInternal ? '(Internal)' : '(External)'}`;
                        btn.title = modeTooltip;
                    }, 3000);
                }
            });
        });

        document.querySelectorAll('.midjourney-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                logger.debug('🔵 Midjourney button clicked!');
                
                const promptDiv = e.target.closest('.prompt-item');
                if (!promptDiv) {
                    logger.error('Could not find prompt-item parent');
                    return;
                }
                
                const textarea = promptDiv.querySelector('.prompt-text');
                if (!textarea) {
                    logger.error('Could not find prompt-text textarea');
                    return;
                }
                
                logger.debug('📝 Sending prompt:', textarea.value.substring(0, 100) + '...');
                
                if (textarea) {
                    btn.disabled = true;
                    
                    let browserMode = 'external';
                    if (window.getCurrentBrowserMode) {
                        browserMode = window.getCurrentBrowserMode();
                    }
                    
                    // Use consistent loading state
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                    
                    // Always use global browser setting for Midjourney
                    try {
                        await window.sendPromptWithGlobalSetting(textarea.value, 'midjourney');
                        logger.debug('✅ Send completed successfully');
                    } catch (error) {
                        logger.error('❌ Send failed:', error);
                    }
                    
                    // Re-enable button after delay
                    setTimeout(() => {
                        btn.disabled = false;
                        
                        let browserMode = 'external';
                        if (window.getCurrentBrowserMode) {
                            browserMode = window.getCurrentBrowserMode();
                        }
                        
                        // Restore consistent styling
                        const isInternal = browserMode === 'internal';
                        const modeTooltip = isInternal ? 'Opens in app webview' : 'Opens in external browser';
                        
                        btn.className = `midjourney-btn ${isInternal ? 'send-btn-internal' : 'send-btn-external'}`;
                        btn.innerHTML = `${isInternal ? '<i class="fas fa-desktop"></i>' : '<i class="fas fa-external-link-alt"></i>'} Midjourney ${isInternal ? '(Internal)' : '(External)'}`;
                        btn.title = modeTooltip;
                    }, 3000);
                }
            });
        });

        // REMOVED Batch action handlers. These are now initialized once in renderer.js to prevent loops.
    },

    getSelectedPrompts: function() {
        const selectedPrompts = [];
        document.querySelectorAll('.prompt-item').forEach(promptDiv => {
            const checkbox = promptDiv.querySelector('.prompt-selector');
            const textarea = promptDiv.querySelector('.prompt-text');
            if (checkbox && checkbox.checked && textarea) {
                selectedPrompts.push(textarea.value);
            }
        });
        return selectedPrompts;
    },

    generateWithChatGPT: async function(promptText, model = 'openai/gpt-4.1-mini') {
        // Use backend proxy to keep API key secure AND save to database
        const apiUrl = '/api/prompts/generate';

        // Show loading state
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    promptText: promptText,
                    model: model
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'API error');
            }

            // The backend returns already parsed prompts
            const prompts = result.prompts;
            
            // Store session ID for potential future use
            if (result.sessionId) {
                logger.debug('Prompt session saved with ID:', result.sessionId);
            }
            
            // Display the prompts, which will add the current parameters for display.
            this.displayGeneratedPrompts(prompts);

            // Load recent prompts for dashboard
            if (window.app && window.app.loadRecentPrompts) {
                window.app.loadRecentPrompts();
            }

            window.Utils.showToast('Successfully generated and saved prompts!', 'success');
            return prompts;
        } catch (error) {
            console.error('Error generating prompts:', error);
            window.Utils.showToast('Error generating prompts: ' + error.message, 'error');
            return [];
        } finally {
            // Hide loading state
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    },

    parseGeneratedPrompts: function(text) {
        logger.debug('Raw response from AI:', text);
        // This function now ONLY cleans the AI response into an array of prompts.
        // It should not add any prefixes or parameters.
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith("Here are") && !line.startsWith("Sure,")) // Filter out conversational filler
            .map(prompt => {
                // Remove any accidental prefixes from the AI, but don't add our own.
                return prompt.replace(/^\/imagine prompt:\s*/i, '').trim();
            });
    }
};
