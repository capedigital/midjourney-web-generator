window.Generator = {
    generatePrompts: function(inputText, elements) {
        console.log('Generating prompts from:', inputText);
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
        console.log('Using parameter suffix:', parameterSuffix);

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
                    <input type="checkbox" class="prompt-selector" checked>
                    <span class="prompt-title">Prompt ${index + 1}</span>
                </div>
                <textarea class="prompt-text">${fullPrompt}</textarea>
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
                    <button class="ideogram-btn ${isInternal ? 'send-btn-internal' : 'send-btn-external'}" title="${modeTooltip}">
                        ${isInternal ? '<i class="fas fa-desktop"></i>' : '<i class="fas fa-external-link-alt"></i>'} Ideogram ${isInternal ? '(Internal)' : '(External)'}
                    </button>
                    <button class="midjourney-btn ${isInternal ? 'send-btn-internal' : 'send-btn-external'}" title="${modeTooltip}">
                        ${isInternal ? '<i class="fas fa-desktop"></i>' : '<i class="fas fa-external-link-alt"></i>'} Midjourney ${isInternal ? '(Internal)' : '(External)'}
                    </button>
                </div>
            `;
            container.appendChild(promptDiv);

            // CRITICAL: Store the CLEAN base prompt without /imagine prefix or parameters
            const textarea = promptDiv.querySelector('.prompt-text');
            if (textarea) {
                console.log('Storing clean basePrompt:', cleanBasePrompt);
                textarea.dataset.basePrompt = cleanBasePrompt;
                console.log('Stored dataset.basePrompt:', textarea.dataset.basePrompt);
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
                    console.log('🎨 Using clean basePrompt for Ideogram:', cleanPrompt);
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
                    
                    // Always use global browser setting for Midjourney
                    window.sendPromptWithGlobalSetting(textarea.value, 'midjourney');
                    
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
        const apiKey = window.Config?.OPENROUTER_API_KEY || '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';
        const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

        // Show loading state
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        try {
            // Add retry logic with exponential backoff
            const maxRetries = 3;
            let attempt = 0;
            let lastError;

            while (attempt < maxRetries) {
                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                            'HTTP-Referer': window.location.href,
                            'Origin': window.location.origin
                        },
                        body: JSON.stringify({
                            model: model, // Use the passed-in model
                            messages: [{
                                role: 'user',
                                content: promptText
                            }]
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`API error: ${response.status}`);
                    }

                    const data = await response.json();
                    const generatedText = data.choices[0].message.content;

                    // Parse the prompts into a clean array, without parameters.
                    const prompts = this.parseGeneratedPrompts(generatedText);
                    
                    // Display the prompts, which will add the current parameters for display.
                    this.displayGeneratedPrompts(prompts);

                    window.Utils.showToast('Successfully generated prompts!', 'success');
                    return prompts;
                } catch (error) {
                    lastError = error;
                    attempt++;
                    if (attempt < maxRetries) {
                        // Wait with exponential backoff
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    }
                }
            }

            throw lastError; // If all retries failed
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
        console.log('Raw response from AI:', text);
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
