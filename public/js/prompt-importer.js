/**
 * Prompt Importer - Handles importing prompts from various formats
 */
class PromptImporter {
    constructor() {
        this.parsedPrompts = [];
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('parse-prompts-btn')?.addEventListener('click', () => this.parsePrompts());
        document.getElementById('clear-import-btn')?.addEventListener('click', () => this.clearImport());
        document.getElementById('import-prompts-btn')?.addEventListener('click', () => this.importPrompts());
        document.getElementById('cancel-import-btn')?.addEventListener('click', () => this.cancelImport());
    }

    parsePrompts() {
        const input = document.getElementById('prompt-import').value.trim();
        
        if (!input) {
            this.showStatus('Please paste some content to parse.', 'warning');
            return;
        }

        try {
            this.parsedPrompts = this.extractPromptsFromText(input);
            
            if (this.parsedPrompts.length === 0) {
                this.showStatus('No prompts found. Try a different format.', 'error');
                return;
            }

            this.showPreview();
            this.showStatus(`Found ${this.parsedPrompts.length} prompts`, 'success');
            
        } catch (error) {
            console.error('Error parsing prompts:', error);
            this.showStatus('Error parsing content. Check format and try again.', 'error');
        }
    }

    extractPromptsFromText(text) {
        const prompts = [];
        
        // Try JSON format first
        try {
            const jsonData = JSON.parse(text);
            if (jsonData.prompts && Array.isArray(jsonData.prompts)) {
                return jsonData.prompts.map(p => this.cleanPrompt(p)).filter(p => p);
            }
        } catch (e) {
            // Not JSON, continue with other methods
        }

        // Split by lines and extract prompts
        const lines = text.split(/\r?\n/);
        
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            // Skip common non-prompt lines
            if (this.isNonPromptLine(line)) continue;
            
            // Extract prompts from various formats
            const extractedPrompts = this.extractFromLine(line);
            prompts.push(...extractedPrompts);
        }

        return prompts.filter(p => p && p.length > 10); // Filter out very short "prompts"
    }

    isNonPromptLine(line) {
        const skipPatterns = [
            /^here are \d+/i,
            /^here's/i,
            /^\d+\.\s*$/,  // Numbered lists without content
            /^-\s*$/,  // Empty bullet points
            /^prompt \d+:\s*$/i,
            /^version/i,
            /^based on/i,
            /^these prompts/i,
            /^i've created/i,
            /^each prompt/i,
            /^sure!/i,
            /^of course/i
        ];
        
        return skipPatterns.some(pattern => pattern.test(line)) || line.length < 10;
    }

    extractFromLine(line) {
        const prompts = [];
        
        // Remove common prefixes
        line = line.replace(/^\d+\.\s*/, '')  // "1. "
                  .replace(/^-\s*/, '')       // "- "
                  .replace(/^\*\s*/, '')      // "* "
                  .replace(/^prompt \d+:\s*/i, '') // "Prompt 1: "
                  .trim();
        
        // Split by multiple prompts in one line (separated by " | " or similar)
        const splitPrompts = line.split(/\s*\|\s*/);
        
        for (let prompt of splitPrompts) {
            prompt = this.cleanPrompt(prompt);
            if (prompt && prompt.length > 10) {
                prompts.push(prompt);
            }
        }
        
        return prompts;
    }

    cleanPrompt(prompt) {
        if (!prompt) return '';
        
        // Clean up the prompt
        prompt = prompt.trim()
            .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
            .replace(/^\/imagine\s+prompt:\s*/i, '')  // Remove /imagine prompt: prefix
            .trim();
            
        // Add /imagine prompt: if not present and prompt is substantial
        if (prompt && !prompt.toLowerCase().startsWith('/imagine')) {
            prompt = `/imagine prompt: ${prompt}`;
        }
        
        return prompt;
    }

    showPreview() {
        const previewSection = document.getElementById('import-preview');
        const promptsList = document.getElementById('parsed-prompts-list');
        
        promptsList.innerHTML = '';
        
        this.parsedPrompts.forEach((prompt, index) => {
            const promptEl = document.createElement('div');
            promptEl.className = 'parsed-prompt-item';
            promptEl.textContent = `${index + 1}. ${prompt}`;
            promptsList.appendChild(promptEl);
        });
        
        previewSection.style.display = 'block';
    }

    importPrompts() {
        if (this.parsedPrompts.length === 0) {
            this.showStatus('No prompts to import.', 'warning');
            return;
        }

        // Switch to Prompt Generation module
        this.switchToPromptGeneration();
        
        // Process prompts with parameters using existing system
        this.processPromptsWithParameters();
        
        // Clear the importer
        this.clearImport();
        
        // Show success message
        this.showNotification(`Successfully imported ${this.parsedPrompts.length} prompts!`, 'success');
    }

    switchToPromptGeneration() {
        // Use app's switchModule method to properly update navigation and URL
        if (window.app && window.app.switchModule) {
            window.app.switchModule('prompt-generation-module');
        } else {
            // Fallback to manual switching if app not available
            const modules = document.querySelectorAll('.module-content');
            const menuItems = document.querySelectorAll('.menu-item');
            
            modules.forEach(module => module.classList.remove('active'));
            menuItems.forEach(item => item.classList.remove('active'));
            
            // Activate Prompt Generation module
            const promptGenModule = document.getElementById('prompt-generation-module');
            const promptGenMenuItem = document.querySelector('[data-module="prompt-generation-module"]');
            
            if (promptGenModule) promptGenModule.classList.add('active');
            if (promptGenMenuItem) promptGenMenuItem.classList.add('active');
        }
    }

    processPromptsWithParameters() {
        // Clear existing prompts
        const generatedPromptsDiv = document.getElementById('generatedPrompts');
        if (!generatedPromptsDiv) {
            console.error('Generated prompts div not found');
            return;
        }

        // Actually clear the existing content
        logger.debug('Clearing existing prompts before importing new ones');
        generatedPromptsDiv.innerHTML = '';

        // Temporarily disable auto-apply to prevent timing conflicts
        const originalAutoApply = localStorage.getItem('mj-auto-apply');
        localStorage.setItem('mj-auto-apply', 'false');

        // Use the existing system to process prompts with parameters
        // Force manual processing to avoid prompt concatenation issues
        logger.debug('PromptImporter: Processing', this.parsedPrompts.length, 'individual prompts');
        this.parsedPrompts.forEach((prompt, index) => {
            logger.debug(`PromptImporter: Adding prompt ${index + 1}:`, prompt.substring(0, 50) + '...');
            this.addPromptWithParameters(prompt, generatedPromptsDiv);
        });
        
        // After importing, apply current parameters to all prompts (like Template Builder does)
        setTimeout(() => {
            if (window.MidjourneyHandler && window.MidjourneyHandler.applyParametersToAll) {
                logger.debug('PromptImporter: Applying current parameters to imported prompts');
                window.MidjourneyHandler.applyParametersToAll();
            }
            
            // Restore original auto-apply setting
            if (originalAutoApply !== null) {
                localStorage.setItem('mj-auto-apply', originalAutoApply);
            } else {
                localStorage.removeItem('mj-auto-apply');
            }
        }, 500); // Increased delay to ensure proper timing
    }

    addPromptWithParameters(prompt, container) {
        // Store clean base prompt and let the display system handle parameters like Template Builder
        const cleanPrompt = prompt.replace(/^\/imagine\s+prompt:\s*/i, '').trim();
        logger.debug('🔍 addPromptWithParameters called with clean prompt:', cleanPrompt.substring(0, 100) + '...');
        
        // Create prompt element using existing system structure
        const promptDiv = document.createElement('div');
        promptDiv.className = 'prompt-item';
        
        // Get the prompt index for title
        const existingPrompts = container.querySelectorAll('.prompt-item');
        const index = existingPrompts.length + 1;
        logger.debug('🔍 Creating prompt element', index, 'existing prompts:', existingPrompts.length);
        
        // Create initial display with /imagine prefix but NO parameters yet
        const initialPrompt = `/imagine prompt: ${cleanPrompt}`;
        logger.debug('🔍 Initial prompt value:', initialPrompt.substring(0, 100) + '...');
        
        promptDiv.innerHTML = `
            <div class="prompt-header-compact">
                // <input type="checkbox" class="prompt-selector" checked>
                <span class="prompt-title">${index}</span>
            </div>
            <div class="prompt-content-compact">
                <textarea class="prompt-text">${initialPrompt}</textarea>
            </div>
            <div class="prompt-actions-compact">
                <button class="copy-prompt" title="Copy to clipboard">
                    <i class="fas fa-copy"></i>  Copy
                </button>
                <button class="delete-prompt" title="Delete prompt">
                    <i class="fas fa-trash"></i>  Delete    
                </button>
                <button class="send-ideogram ideogram-btn" title="Send to Ideogram">
                    <i class="fas fa-image"></i> Ideogram
                </button>
                <button class="send-midjourney midjourney-btn" title="Send to Midjourney">
                    <i class="fas fa-paint-brush"></i> Midjourney
                </button>
            </div>
        `;
        
        // CRITICAL: Add to DOM FIRST, then attach event listeners
        container.appendChild(promptDiv);
        
        // Add event listeners for all buttons AFTER element is in DOM
        this.attachButtonEventListeners(promptDiv);
        
        // Update button styling to match current browser mode
        if (window.updateAllButtonsSimple) {
            window.updateAllButtonsSimple();
        }
        
        // CRITICAL: Store the clean base prompt in the dataset
        const textarea = promptDiv.querySelector('.prompt-text');
        if (textarea) {
            logger.debug('🔍 Storing basePrompt for prompt', index, ':', cleanPrompt.substring(0, 50) + '...');
            textarea.dataset.basePrompt = cleanPrompt;
            logger.debug('🔍 Stored dataset.basePrompt length:', textarea.dataset.basePrompt.length);
        }
    }

    attachButtonEventListeners(promptDiv) {
        console.log('🔧🔧🔧 attachButtonEventListeners CALLED');
        logger.debug('🔧 [IMPORTER] attachButtonEventListeners called');
        
        const textarea = promptDiv.querySelector('.prompt-text');
        
        if (!textarea) {
            console.log('❌ NO TEXTAREA FOUND');
            logger.error('❌ [IMPORTER] No textarea found in promptDiv');
            return;
        }
        
        logger.debug('✅ [IMPORTER] Found textarea, setting up event listeners...');

        // Copy button
        const copyBtn = promptDiv.querySelector('.copy-prompt');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(textarea.value).then(() => {
                this.showNotification('Prompt copied to clipboard!', 'success');
            }).catch(() => {
                this.showNotification('Failed to copy prompt', 'error');
            });
        });

        // Delete button
        const deleteBtn = promptDiv.querySelector('.delete-prompt');
        deleteBtn.addEventListener('click', () => {
            promptDiv.remove();
            this.showNotification('Prompt deleted!', 'success');
        });

        // Midjourney button
        const midjourneyBtn = promptDiv.querySelector('.send-midjourney');
        if (!midjourneyBtn) {
            console.error('❌ Could not find .send-midjourney button');
            return;
        }
        
        const self = this;
        midjourneyBtn.addEventListener('click', function(e) {
            console.log('🔵 MIDJOURNEY BUTTON CLICKED');
            logger.debug('🔵 [IMPORTER] Midjourney button clicked!');
            
            midjourneyBtn.disabled = true;
            midjourneyBtn.textContent = 'Sending...';
            
            if (window.sendPromptWithGlobalSetting) {
                logger.debug('✅ [IMPORTER] Calling sendPromptWithGlobalSetting');
                window.sendPromptWithGlobalSetting(textarea.value, 'midjourney');
                self.showNotification('Sending prompt to Midjourney...', 'info');
            } else {
                logger.error('❌ [IMPORTER] sendPromptWithGlobalSetting not available');
                self.showNotification('Midjourney integration not available', 'error');
            }
            
            setTimeout(() => {
                midjourneyBtn.disabled = false;
                midjourneyBtn.innerHTML = '<i class="fas fa-paint-brush"></i> Midjourney';
            }, 3000);
        });

        // Ideogram button
        const ideogramBtn = promptDiv.querySelector('.send-ideogram');
        ideogramBtn.addEventListener('click', () => {
            ideogramBtn.disabled = true;
            ideogramBtn.textContent = 'Sending...';
            
            let ideogramPrompt = textarea.value.replace(/^\/imagine prompt:\s+/i, '');
            ideogramPrompt = ideogramPrompt.replace(/\s+(--ar\s+[\d:]+|--stylize\s+\d+|--chaos\s+\d+|--c\s+\d+|--weird\s+\d+|--style\s+\w+|--niji\s+\d+|--turbo|--fast|--relax|--v\s+[\d\.]+|--zoom\s+[\d\.]+|--draft|--standard|--mode\s+\w+|--sw\s+\d+|--no\s+[\w\s,]+|--p\s+\w+|--sref\s+[\w\-:/.]+)/g, '');
            
            if (window.sendPromptWithGlobalSetting) {
                window.sendPromptWithGlobalSetting(ideogramPrompt.trim(), 'ideogram');
                this.showNotification('Sending prompt to Ideogram...', 'info');
            } else {
                this.showNotification('Ideogram integration not available', 'error');
            }
            
            setTimeout(() => {
                ideogramBtn.disabled = false;
                ideogramBtn.innerHTML = '<i class="fas fa-image"></i> Ideogram';
            }, 3000);
        });
    }

    applyParameters(prompt) {
        // Get current Midjourney parameters using existing system
        let parameterSuffix = '';
        if (window.MidjourneyHandler && typeof window.MidjourneyHandler.getCurrentMJParameters === 'function') {
            parameterSuffix = window.MidjourneyHandler.getCurrentMJParameters();
        } else {
            // Fallback to manual parameter collection
            parameterSuffix = this.getCurrentParameters().join(' ');
        }
        
        // Remove existing /imagine prompt: if present
        let cleanPrompt = prompt.replace(/^\/imagine\s+prompt:\s*/i, '').trim();
        
        // Build the full prompt with parameters (same as existing system)
        let fullPrompt = `/imagine prompt: ${cleanPrompt} ${parameterSuffix}`.replace(/\s+/g, ' ').trim();
        
        return fullPrompt;
    }

    getCurrentParameters() {
        const params = [];
        
        // Get all parameter values from the UI
        const aspectRatio = document.getElementById('aspect-ratio')?.value;
        const stylize = document.getElementById('stylize-value')?.value;
        const chaos = document.getElementById('chaos-value')?.value;
        const speed = document.getElementById('speed-value')?.value;
        const styleVersion = document.getElementById('style-version')?.value;
        const mode = document.getElementById('mode-value')?.value;
        const version = document.getElementById('version-value')?.value;
        const styleWeight = document.getElementById('style-weight-value')?.value;
        const noValue = document.getElementById('no-value')?.value;
        
        // Add parameters if they have values
        if (aspectRatio) params.push(aspectRatio);
        if (stylize) params.push(stylize);
        if (chaos) params.push(chaos);
        if (speed) params.push(speed);
        if (styleVersion) params.push(styleVersion);
        if (mode) params.push(mode);
        if (version) params.push(version);
        if (styleWeight) params.push(styleWeight);
        if (noValue) params.push(`--no ${noValue}`);
        
        return params;
    }

    cancelImport() {
        document.getElementById('import-preview').style.display = 'none';
        this.parsedPrompts = [];
        this.showStatus('Import cancelled.', 'info');
    }

    clearImport() {
        document.getElementById('prompt-import').value = '';
        document.getElementById('import-preview').style.display = 'none';
        this.parsedPrompts = [];
        this.showStatus('', '');
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('import-status');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = `import-status ${type}`;
        
        // Add CSS for different status types
        statusEl.style.color = {
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        }[type] || 'var(--text-secondary)';
    }

    showNotification(message, type = 'info') {
        // Create or update notification
        let notification = document.getElementById('import-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'import-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1em 1.5em;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                z-index: 1000;
                transition: all 0.3s ease;
                max-width: 300px;
                word-wrap: break-word;
            `;
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.background = {
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        }[type] || '#17a2b8';
        
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateY(-100%)';
            notification.style.opacity = '0';
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.promptImporter = new PromptImporter();
    logger.debug('Prompt Importer initialized');
});
