/**
 * Template Builder Module
 * Handles template selection, enhancer fields, and prompt generation
 */

window.TemplateBuilder = {
    init: function() {
        logger.debug('Initializing Template Builder...');
        this.populateTemplateDropdown();
        this.setupEventListeners();
        this.initializeClickToEdit();
        logger.debug('Template Builder initialized');
    },

    /**
     * Initialize click-to-edit for all enhancer fields
     */
    initializeClickToEdit: function() {
        // Apply to all enhancer textareas
        const enhancerInputs = document.querySelectorAll('.enhancer-input');
        enhancerInputs.forEach(input => {
            this.convertToClickToEdit(input);
        });

        // Apply to copywriter brief
        const briefTextarea = document.getElementById('copywriterBrief');
        if (briefTextarea) {
            this.convertToClickToEdit(briefTextarea);
        }
    },

    /**
     * Convert a textarea to click-to-edit interface
     */
    convertToClickToEdit: function(textarea) {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'click-to-edit-wrapper';
        
        // Create display element
        const display = document.createElement('div');
        display.className = 'click-to-edit-display';
        display.textContent = textarea.value || textarea.placeholder;
        if (!textarea.value) {
            display.classList.add('placeholder');
        }
        
        // Create edit container
        const editContainer = document.createElement('div');
        editContainer.className = 'click-to-edit-edit';
        editContainer.style.display = 'none';
        
        // Clone the textarea
        const editTextarea = textarea.cloneNode(true);
        editTextarea.className = textarea.className + ' edit-textarea';
        
        // Create action buttons
        const actions = document.createElement('div');
        actions.className = 'click-to-edit-actions';
        actions.innerHTML = `
            <button class="save-btn" type="button"><i class="fas fa-check"></i> Save</button>
            <button class="cancel-btn" type="button"><i class="fas fa-times"></i> Cancel</button>
        `;
        
        editContainer.appendChild(editTextarea);
        editContainer.appendChild(actions);
        
        // Insert wrapper and move elements
        textarea.parentNode.insertBefore(wrapper, textarea);
        wrapper.appendChild(display);
        wrapper.appendChild(editContainer);
        wrapper.appendChild(textarea);
        textarea.style.display = 'none';
        
        // Store references
        wrapper._textarea = textarea;
        wrapper._display = display;
        wrapper._editContainer = editContainer;
        wrapper._editTextarea = editTextarea;
        
        // Click to edit
        display.addEventListener('click', () => {
            this.enterEditMode(wrapper);
        });
        
        // Save button
        actions.querySelector('.save-btn').addEventListener('click', () => {
            this.saveEdit(wrapper);
        });
        
        // Cancel button
        actions.querySelector('.cancel-btn').addEventListener('click', () => {
            this.cancelEdit(wrapper);
        });
        
        // Enter to save
        editTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.saveEdit(wrapper);
            } else if (e.key === 'Escape') {
                this.cancelEdit(wrapper);
            }
        });
    },

    /**
     * Enter edit mode
     */
    enterEditMode: function(wrapper) {
        const { _display, _editContainer, _editTextarea, _textarea } = wrapper;
        
        _display.style.display = 'none';
        _editContainer.style.display = 'block';
        _editTextarea.value = _textarea.value;
        _editTextarea.focus();
        
        // Auto-resize textarea
        _editTextarea.style.height = 'auto';
        _editTextarea.style.height = _editTextarea.scrollHeight + 'px';
    },

    /**
     * Save edit
     */
    saveEdit: function(wrapper) {
        const { _display, _editContainer, _editTextarea, _textarea } = wrapper;
        
        const newValue = _editTextarea.value.trim();
        _textarea.value = newValue;
        
        // Update display
        if (newValue) {
            _display.textContent = newValue;
            _display.classList.remove('placeholder');
        } else {
            _display.textContent = _textarea.placeholder;
            _display.classList.add('placeholder');
        }
        
        // Exit edit mode
        _display.style.display = 'block';
        _editContainer.style.display = 'none';
        
        // Trigger change event for preview update
        _textarea.dispatchEvent(new Event('input', { bubbles: true }));
    },

    /**
     * Cancel edit
     */
    cancelEdit: function(wrapper) {
        const { _display, _editContainer } = wrapper;
        
        _display.style.display = 'block';
        _editContainer.style.display = 'none';
    },

    /**
     * Populate template dropdown with options from Config
     */
    populateTemplateDropdown: function() {
        const templateSelect = document.getElementById('templateSelect');
        if (!templateSelect) {
            logger.debug('Template select element not found');
            return;
        }

        if (!window.Config || !window.Config.templateFormulas) {
            logger.error('Config.templateFormulas not available');
            return;
        }

        // Clear existing options except the first (placeholder)
        while (templateSelect.options.length > 1) {
            templateSelect.remove(1);
        }

        // Add all available templates
        Object.keys(window.Config.templateFormulas).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            
            // Format display name (kebab-case to Title Case)
            const displayName = key.split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            option.textContent = displayName;
            templateSelect.appendChild(option);
        });

        logger.debug(`Populated ${Object.keys(window.Config.templateFormulas).length} templates`);
    },

    /**
     * Setup event listeners for template builder
     */
    setupEventListeners: function() {
        // Template selection change
        const templateSelect = document.getElementById('templateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', () => {
                this.onTemplateChange();
            });
        }

        // Generate button
        const generateBtn = document.getElementById('generate-image-prompts');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generatePrompts();
            });
        }

        // Enhancer inputs - update preview on change
        document.querySelectorAll('.enhancer-input').forEach(input => {
            input.addEventListener('input', () => {
                this.updateOutputPreview();
            });
        });

        // Copywriter brief - update preview on change
        const briefTextarea = document.getElementById('copywriterBrief');
        if (briefTextarea) {
            briefTextarea.addEventListener('input', () => {
                this.updateOutputPreview();
            });
        }

        // Prompt count selector
        const promptCount = document.getElementById('prompt-count');
        if (promptCount) {
            promptCount.addEventListener('change', () => {
                this.updateOutputPreview();
            });
        }
    },

    /**
     * Handle template selection change
     */
    onTemplateChange: function() {
        const templateSelect = document.getElementById('templateSelect');
        const promptTemplate = document.getElementById('promptTemplate');
        
        if (!templateSelect || !promptTemplate) return;

        const selectedTemplate = templateSelect.value;
        
        if (selectedTemplate && window.Config.templateFormulas[selectedTemplate]) {
            // Show the template text
            promptTemplate.value = window.Config.templateFormulas[selectedTemplate];
            
            // Update output preview
            this.updateOutputPreview();
            
            logger.debug('Template selected:', selectedTemplate);
        } else {
            promptTemplate.value = '';
            document.getElementById('outputPreview').value = '';
        }
    },

    /**
     * Update the output preview with current enhancers
     */
    updateOutputPreview: function() {
        const templateSelect = document.getElementById('templateSelect');
        const outputPreview = document.getElementById('outputPreview');
        const promptCount = document.getElementById('prompt-count');
        
        if (!templateSelect || !outputPreview) return;

        const selectedTemplate = templateSelect.value;
        if (!selectedTemplate) {
            outputPreview.value = 'Please select a template first';
            return;
        }

        const count = promptCount ? parseInt(promptCount.value) : 3;
        const model = document.getElementById('template-ai-model')?.value || 'openai/gpt-4o-mini';

        // Build AI prompt with enhancers
        const aiPrompt = window.Config.updateAIPromptWithEnhancers();
        
        outputPreview.value = `AI Model: ${model}\nPrompts to generate: ${count}\n\n${aiPrompt}`;
    },

    /**
     * Generate prompts using selected template and enhancers
     */
    async generatePrompts() {
        const templateSelect = document.getElementById('templateSelect');
        const generateBtn = document.getElementById('generate-image-prompts');
        const promptCount = document.getElementById('prompt-count');
        const aiModel = document.getElementById('template-ai-model');
        
        if (!templateSelect || !templateSelect.value) {
            window.Utils.showToast('Please select a template first', 'error');
            return;
        }

        const count = promptCount ? parseInt(promptCount.value) : 3;
        const model = aiModel ? aiModel.value : 'openai/gpt-4o-mini';

        // Disable button during generation
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            // Build the AI prompt with current enhancers
            const aiPrompt = window.Config.updateAIPromptWithEnhancers();
            
            logger.debug('Generating prompts with AI:', { count, model });
            
            // Call OpenRouter API via backend
            const response = await fetch('/api/openrouter/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    model: model,
                    temperature: 0.9,
                    max_tokens: 2000
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate prompts');
            }

            // Parse and display the generated prompts
            const generatedText = data.response;
            logger.debug('Generated text received:', generatedText.substring(0, 200) + '...');
            
            // Use Generator to parse and display
            if (window.Generator) {
                window.Generator.generatePrompts(generatedText);
                
                // Switch to Prompt Generation module to show results
                if (window.app) {
                    window.app.switchModule('prompt-generation-module');
                }
                
                window.Utils.showToast(`Generated ${count} prompts successfully!`, 'success');
            } else {
                logger.error('Generator module not available');
                window.Utils.showToast('Generator module not available', 'error');
            }

        } catch (error) {
            logger.error('Generate prompts error:', error);
            window.Utils.showToast('Error: ' + error.message, 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = 'Generate Image Prompts...';
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for Config to be available
    setTimeout(() => {
        window.TemplateBuilder.init();
    }, 100);
});
