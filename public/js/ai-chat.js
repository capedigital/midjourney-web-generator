/**
 * AI Chat Assistant - ChatGPT-style interface for prompt generation
 */

class AIChatAssistant {
    constructor() {
        this.apiKey = window.Config?.OPENROUTER_API_KEY;
        this.isGenerating = false;
        this.templateMode = 'freeform';
        this.selectedTemplate = '';
        this.messages = []; // Initialize messages array
        this.currentSessionId = null; // Track current session
        this.maxStoredChats = 250; // Limit stored chats
        
        this.init();
    }

    init() {
        this.initializeDOMElements();
        this.initializeTemplateDropdown();
        this.initializeCurrentModel();
        this.setupEventListeners();
        this.setupAutoResize();
        this.loadLatestSessionOnStartup();
    }

    loadLatestSessionOnStartup() {
        // Optionally load the most recent session on startup (disabled by default)
        // User can manually load sessions via history modal
        console.log('Chat history auto-save enabled. Use History button to access saved chats.');
    }

    initializeDOMElements() {
        // Get references to DOM elements with error handling
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-chat-btn');
        this.chatStatus = document.getElementById('chat-status');
        this.modelSelector = document.getElementById('chat-ai-model');
        this.templateModeSelector = document.getElementById('chat-template-mode');
        this.clearChatBtn = document.getElementById('clear-chat-btn');
        this.fileUploadBtn = document.getElementById('file-upload-btn');
        this.fileInput = document.getElementById('file-input');
        this.filePreview = document.getElementById('file-preview');
        
        // Initialize file upload state
        this.currentFile = null;
        
        // Check if essential elements exist
        if (!this.chatMessages) {
            console.warn('⚠️ AI Chat: chat-messages element not found - will retry when tab is opened');
        } else {
            console.log('✅ AI Chat DOM elements initialized successfully');
        }
    }

    initializeTemplateDropdown() {
        const templateSelect = document.getElementById('chat-template-select');
        const templateModeSelect = document.getElementById('chat-template-mode');
        
        if (!templateSelect || !templateModeSelect) {
            console.log('AI Chat template elements not found');
            return;
        }
        
        // Populate template dropdown with same templates as Template Builder
        if (window.Config && window.Config.templateFormulas) {
            // Clear existing options except default
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
            
            console.log('AI Chat template dropdown populated with', Object.keys(window.Config.templateFormulas).length, 'templates');
        } else {
            console.log('Config.templateFormulas not available for AI Chat');
        }
        
        // Handle template mode changes to show/hide template dropdown
        templateModeSelect.addEventListener('change', (e) => {
            this.templateMode = e.target.value;
            const modeText = e.target.selectedOptions[0].text;
            
            if (this.templateMode === 'current-template') {
                templateSelect.style.display = 'inline-block';
                this.addStatusMessage(`Template mode: ${modeText} - Select a template`);
            } else {
                templateSelect.style.display = 'none';
                this.selectedTemplate = '';
                this.addStatusMessage(`Template mode: ${modeText}`);
            }
        });
        
        // Handle template selection
        templateSelect.addEventListener('change', (e) => {
            this.selectedTemplate = e.target.value;
            const templateText = e.target.selectedOptions[0].text;
            if (this.selectedTemplate) {
                this.addStatusMessage(`Using template: ${templateText}`);
            }
        });
    }

    initializeCurrentModel() {
        // Initialize currentModel from saved preference or dropdown's selected value
        const savedModel = localStorage.getItem('global-ai-model');
        if (savedModel && this.modelSelector) {
            // Check if saved model exists in current dropdown options
            const option = this.modelSelector.querySelector(`option[value="${savedModel}"]`);
            if (option) {
                this.currentModel = savedModel;
                this.modelSelector.value = savedModel;
                console.log('AI Chat restored saved model:', this.currentModel);
            } else {
                // Fallback to dropdown default if saved model not available
                this.currentModel = this.modelSelector.value;
                console.log('AI Chat using dropdown default (saved model not available):', this.currentModel);
            }
        } else if (this.modelSelector) {
            this.currentModel = this.modelSelector.value;
            console.log('AI Chat initialized with dropdown default:', this.currentModel);
        } else {
            // Fallback if selector not found
            this.currentModel = 'openai/gpt-4.1-nano';
            console.warn('Model selector not found, using fallback:', this.currentModel);
        }

        // Initialize global model sync
        this.initializeGlobalModelSync();
    }

    initializeGlobalModelSync() {
        // Create global model manager if it doesn't exist
        if (!window.globalModelManager) {
            window.globalModelManager = {
                currentModel: this.currentModel,
                subscribers: [],
                
                setModel(newModel) {
                    this.currentModel = newModel;
                    localStorage.setItem('global-ai-model', newModel);
                    console.log('Global model changed to:', newModel);
                    
                    // Update all subscribers
                    this.subscribers.forEach(callback => {
                        try {
                            callback(newModel);
                        } catch (error) {
                            console.error('Error updating model subscriber:', error);
                        }
                    });
                },
                
                subscribe(callback) {
                    this.subscribers.push(callback);
                },
                
                unsubscribe(callback) {
                    const index = this.subscribers.indexOf(callback);
                    if (index > -1) {
                        this.subscribers.splice(index, 1);
                    }
                }
            };
        }

        // Subscribe to global model changes
        this.modelChangeCallback = (newModel) => {
            if (this.currentModel !== newModel) {
                this.currentModel = newModel;
                if (this.modelSelector) {
                    this.modelSelector.value = newModel;
                }
                console.log('AI Chat synced to global model:', newModel);
            }
        };
        
        window.globalModelManager.subscribe(this.modelChangeCallback);

        // Also sync other dropdowns to our current model
        this.syncOtherDropdowns(this.currentModel);
    }

    syncOtherDropdowns(model) {
        // Sync Dashboard dropdown
        const dashboardSelector = document.getElementById('ai-model-selector');
        if (dashboardSelector && dashboardSelector.value !== model) {
            const option = dashboardSelector.querySelector(`option[value="${model}"]`);
            if (option) {
                dashboardSelector.value = model;
                console.log('Synced Dashboard dropdown to:', model);
            }
        }

        // Sync Template Builder dropdown
        const templateSelector = document.getElementById('template-ai-model');
        if (templateSelector && templateSelector.value !== model) {
            const option = templateSelector.querySelector(`option[value="${model}"]`);
            if (option) {
                templateSelector.value = model;
                console.log('Synced Template Builder dropdown to:', model);
            }
        }
    }

    setupEventListeners() {
        // Send button click
        this.sendBtn?.addEventListener('click', () => this.sendMessage());
        
        // Enter key to send (Shift+Enter for new line)
        this.chatInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Input change to enable/disable send button
        this.chatInput?.addEventListener('input', () => {
            const hasText = this.chatInput.value.trim().length > 0;
            this.sendBtn.disabled = (!hasText && !this.currentFile) || this.isGenerating;
        });

        // Paste event for images (including screenshots)
        this.chatInput?.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    // Give pasted images a better name
                    if (!file.name || file.name === 'blob' || file.name === 'image.png') {
                        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
                        Object.defineProperty(file, 'name', {
                            writable: true,
                            value: `screenshot-${timestamp}.png`
                        });
                    }
                    this.addStatusMessage('📋 Screenshot pasted! Ready to analyze.', 'success');
                    this.handleFileUpload(file);
                    break;
                }
            }
        });

        // File upload button
        this.fileUploadBtn?.addEventListener('click', () => {
            this.fileInput?.click();
        });

        // File input change
        this.fileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Give uploaded files the same treatment as pasted images
                this.addStatusMessage('📁 File uploaded! Ready to analyze.', 'success');
                this.handleFileUpload(file);
            }
        });

        // Model selection change
        this.modelSelector?.addEventListener('change', (e) => {
            const newModel = e.target.value;
            this.currentModel = newModel;
            console.log('AI Chat model changed to:', newModel);
            
            // Update global model (this will sync all other dropdowns)
            if (window.globalModelManager) {
                window.globalModelManager.setModel(newModel);
            }
            
            this.addStatusMessage(`Switched to ${e.target.selectedOptions[0].text}`);
        });

        // Clear chat
        this.clearChatBtn?.addEventListener('click', () => this.clearChat());

        // Chat history modal handlers
        this.setupChatHistoryModal();
    }

    setupChatHistoryModal() {
        // Open chat history modal
        const historyBtn = document.querySelector('.chat-history-btn') || document.getElementById('history-chat-btn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.openChatHistoryModal());
        }

        // Close modal handlers
        const closeBtn = document.getElementById('close-chat-history');
        const modal = document.getElementById('chat-history-modal');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeChatHistoryModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeChatHistoryModal();
                }
            });
        }

        // Export all chats
        const exportBtn = document.getElementById('export-all-chats');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportAllChats());
        }

        // Restore and delete chat buttons
        const restoreBtn = document.getElementById('restore-chat');
        const deleteBtn = document.getElementById('delete-chat');
        
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => this.restoreSelectedChat());
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteSelectedChat());
        }
    }

    openChatHistoryModal() {
        const modal = document.getElementById('chat-history-modal');
        if (!modal) return;

        // Ensure the modal has the proper class for styling
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent && !modalContent.classList.contains('chat-history-modal')) {
            modalContent.classList.add('chat-history-modal');
        }

        // Clear any existing preview content to force refresh
        const previewContent = document.getElementById('chat-preview-content');
        if (previewContent) {
            previewContent.innerHTML = `
                <div class="chat-preview-empty">
                    <i class="fas fa-comments"></i>
                    <div>Select a chat session from the left to preview it here</div>
                </div>
            `;
        }

        modal.style.display = 'flex';
        
        // Small delay to ensure modal is fully rendered before populating
        setTimeout(() => {
            this.populateChatSessions();
        }, 50);
    }

    closeChatHistoryModal() {
        const modal = document.getElementById('chat-history-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    populateChatSessions() {
        const sessionsList = document.getElementById('chat-sessions-list');
        if (!sessionsList) {
            console.error('❌ chat-sessions-list element not found');
            return;
        }

        const sessions = this.getSavedSessions();
        console.log('🔍 Loading chat sessions for History modal:', sessions.length);
        console.log('🔍 Raw saved sessions:', sessions);
        
        if (sessions.length === 0) {
            sessionsList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-inbox" style="font-size: 24px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <div>No saved chats yet</div>
                    <div style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
                        Debug: Found ${sessions.length} sessions
                    </div>
                </div>
            `;
            return;
        }

        sessionsList.innerHTML = sessions.map(session => `
            <div class="chat-session-item" data-session-id="${session.id}">
                <div class="chat-session-title">${session.title}</div>
                <div class="chat-session-preview">${this.getSessionPreview(session)}</div>
                <div class="chat-session-date">${this.formatDate(session.timestamp)}</div>
            </div>
        `).join('');

        // Add click handlers for session items
        sessionsList.querySelectorAll('.chat-session-item').forEach(item => {
            item.addEventListener('click', () => this.selectChatSession(item));
        });
    }

    getSessionPreview(session) {
        if (session.messages.length === 0) return 'Empty chat';
        
        const lastMessage = session.messages[session.messages.length - 1];
        const content = typeof lastMessage.content === 'string' 
            ? lastMessage.content 
            : (lastMessage.content.text || '');
        
        return content.length > 100 
            ? content.substring(0, 100) + '...' 
            : content;
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffHours < 1) {
            return 'Just now';
        } else if (diffHours < 24) {
            return `${Math.floor(diffHours)} hours ago`;
        } else if (diffDays < 7) {
            return `${Math.floor(diffDays)} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    selectChatSession(sessionItem) {
        // Remove previous selection
        document.querySelectorAll('.chat-session-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Select current item
        sessionItem.classList.add('selected');

        const sessionId = sessionItem.dataset.sessionId;
        const sessions = this.getSavedSessions();
        const session = sessions.find(s => s.id === sessionId);

        if (session) {
            // Force clear the preview content first
            const previewContent = document.getElementById('chat-preview-content');
            if (previewContent) {
                previewContent.innerHTML = '';
            }
            
            // Then populate with fresh content
            this.previewChatSession(session);
        }
    }

    previewChatSession(session) {
        // Initialize global prompts storage if not exists
        if (!window.chatHistoryPrompts) {
            window.chatHistoryPrompts = {};
        }
        
        const previewContent = document.getElementById('chat-preview-content');
        const previewTitle = document.getElementById('chat-preview-title');
        const previewActions = document.getElementById('chat-preview-actions');

        if (!previewContent || !previewTitle || !previewActions) return;

        console.log('Previewing chat session with CSS classes (not inline styles)');

        previewTitle.textContent = session.title;
        previewActions.style.display = 'flex';
        previewActions.dataset.sessionId = session.id;

        // Generate preview HTML with better formatting and proper classes
        const messagesHTML = session.messages.map(message => {
            const role = message.role;
            const content = typeof message.content === 'string' 
                ? message.content 
                : (message.content.text || JSON.stringify(message.content, null, 2));
            
            // Detect JSON content for import functionality
            const formattedContent = this.formatPreviewContent(content);
            
            return `
                <div class="chat-preview-message ${role}-message">
                    <div class="message-role">
                        <span class="role-icon">${role === 'user' ? '👤' : '🤖'}</span>
                        <span class="role-text">${role === 'user' ? 'You' : 'Assistant'}</span>
                    </div>
                    <div class="message-content">${formattedContent}</div>
                </div>
            `;
        }).join('');

        previewContent.innerHTML = messagesHTML || `
            <div class="chat-preview-empty">
                <i class="fas fa-comments"></i>
                <div>No messages in this chat</div>
            </div>
        `;
        
        // Add event listeners for prompt import buttons
        this.attachPromptImportListeners();
    }

    formatPreviewContent(content) {
        let formattedContent = content;
        let hasDetectedPrompts = false;
        
        // Use the same detection logic as the main chat
        let detectedPrompts = [];
        
        // Method 1: Look for marked JSON format
        const markedJsonPattern = /PROMPTS_JSON_START\s*(\{[\s\S]*?\})\s*PROMPTS_JSON_END/;
        let match = content.match(markedJsonPattern);
        
        if (match) {
            try {
                const jsonData = JSON.parse(match[1]);
                if (jsonData.prompts && Array.isArray(jsonData.prompts)) {
                    detectedPrompts = jsonData.prompts
                        .map(prompt => prompt.trim())
                        .filter(prompt => prompt && prompt.length > 10);
                }
            } catch (error) {
                // Ignore parse errors
            }
        }
        
        // Method 2: Look for plain JSON blocks with "prompts" array
        if (detectedPrompts.length === 0) {
            const plainJsonPattern = /\{\s*"prompts"\s*:\s*\[([\s\S]*?)\]\s*\}/;
            match = content.match(plainJsonPattern);
            
            if (match) {
                try {
                    let cleanJson = match[0]
                        .replace(/\s*\.\.\.\s*/g, '')
                        .replace(/,\s*\]/g, ']')
                        .replace(/,\s*\}/g, '}')
                        .replace(/"[^"]*\.\.\.[^"]*"/g, '""')
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    const jsonData = JSON.parse(cleanJson);
                    if (jsonData.prompts && Array.isArray(jsonData.prompts)) {
                        detectedPrompts = jsonData.prompts
                            .map(prompt => prompt.trim())
                            .filter(prompt => prompt && prompt.length > 10);
                    }
                } catch (error) {
                    // Ignore parse errors
                }
            }
        }
        
        // Method 3: Check for old format JSON arrays that look like prompts
        if (detectedPrompts.length === 0) {
            const jsonArrayRegex = /\[\s*{[^}]*"prompt"[^}]*}[^\]]*\]/g;
            const matches = content.match(jsonArrayRegex);
            
            if (matches) {
                matches.forEach((match, index) => {
                    try {
                        const parsed = JSON.parse(match);
                        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].prompt) {
                            const jsonId = `json-${Date.now()}-${index}`;
                            const prettyJson = JSON.stringify(parsed, null, 2);
                            const jsonHtml = `
                                <div class="json-content" id="${jsonId}" data-json='${this.escapeHtml(prettyJson)}'>
                                    <button class="json-import-btn">
                                        <i class="fas fa-download"></i> Import
                                    </button>
                                    <pre>${this.escapeHtml(prettyJson)}</pre>
                                </div>
                            `;
                            formattedContent = formattedContent.replace(match, jsonHtml);
                            hasDetectedPrompts = true;
                        }
                    } catch (e) {
                        // If JSON parsing fails, leave as is
                    }
                });
            }
        }
        
        // If we found prompts using the new detection methods, add import buttons
        if (detectedPrompts.length > 0) {
            const promptId = `prompts-${Date.now()}`;
            const promptDetectionHtml = `
                <div class="prompt-detection" id="${promptId}">
                    <i class="fas fa-magic"></i>
                    <span>Found ${detectedPrompts.length} prompt${detectedPrompts.length > 1 ? 's' : ''}!</span>
                    <button class="import-prompts-btn">
                        Import to Prompt Generation
                    </button>
                    <button class="copy-json-btn" title="Copy clean JSON for manual import">
                        Copy JSON
                    </button>
                </div>
            `;
            formattedContent = formattedContent + promptDetectionHtml; // Move to bottom
            hasDetectedPrompts = true;
            
            // Store prompts data in a global object to avoid JSON escaping issues
            if (!window.chatHistoryPrompts) {
                window.chatHistoryPrompts = {};
            }
            window.chatHistoryPrompts[promptId] = detectedPrompts;
        }
        
        if (hasDetectedPrompts) {
            return formattedContent;
        }
        
        // For non-JSON content, just escape HTML and preserve formatting
        return this.escapeHtml(content);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        let escaped = div.innerHTML;
        
        // Format JSON blocks with monospace and better spacing
        escaped = escaped.replace(/(\{[\s\S]*?\})/g, '<pre class="json-block">$1</pre>');
        escaped = escaped.replace(/(\[[\s\S]*?\])/g, '<pre class="json-block">$1</pre>');
        
        // Format code snippets (anything between backticks)
        escaped = escaped.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        
        // Preserve line breaks
        escaped = escaped.replace(/\n/g, '<br>');
        
        return escaped;
    }

    attachPromptImportListeners() {
        // Add event listeners for prompt detection buttons
        const promptDetections = document.querySelectorAll('.prompt-detection');
        promptDetections.forEach(detection => {
            const promptId = detection.id;
            const prompts = window.chatHistoryPrompts ? window.chatHistoryPrompts[promptId] : [];
            
            if (prompts && prompts.length > 0) {
                const importBtn = detection.querySelector('.import-prompts-btn');
                const copyBtn = detection.querySelector('.copy-json-btn');
                
                if (importBtn && !importBtn.hasAttribute('data-listener')) {
                    importBtn.setAttribute('data-listener', 'true');
                    importBtn.addEventListener('click', () => {
                        this.importPromptsFromHistory(prompts);
                    });
                }
                
                if (copyBtn && !copyBtn.hasAttribute('data-listener')) {
                    copyBtn.setAttribute('data-listener', 'true');
                    copyBtn.addEventListener('click', () => {
                        this.copyCleanJsonFromHistory(prompts);
                    });
                }
            }
        });
        
        // Add event listeners for old format JSON import buttons
        const jsonImportBtns = document.querySelectorAll('.json-import-btn');
        jsonImportBtns.forEach(btn => {
            if (!btn.hasAttribute('data-listener')) {
                btn.setAttribute('data-listener', 'true');
                btn.addEventListener('click', () => {
                    const jsonContent = btn.parentElement;
                    const jsonData = jsonContent.dataset.json;
                    if (jsonData) {
                        try {
                            const parsed = JSON.parse(jsonData);
                            // Close the history modal first
                            this.closeChatHistoryModal();
                            
                            // Switch to prompt generation module
                            if (window.switchToModule) {
                                window.switchToModule('prompt-generation-module');
                            }
                            
                            // Import the prompts
                            this.importPrompts(parsed);
                        } catch (error) {
                            console.error('Error parsing JSON:', error);
                        }
                    }
                });
            }
        });
    }

    importPromptsFromHistory(prompts) {
        console.log('🔄 importPromptsFromHistory called with', prompts.length, 'prompts');
        
        // Close the history modal first
        console.log('🔄 Closing history modal...');
        this.closeChatHistoryModal();
        
        // Switch to prompt generation module
        console.log('🔄 Switching to prompt generation module...');
        if (window.switchToModule) {
            const result = window.switchToModule('prompt-generation-module');
            console.log('🔄 Module switch result:', result);
        } else {
            console.error('❌ switchToModule function not available');
        }
        
        // Small delay to ensure module switch completes
        setTimeout(() => {
            console.log('🔄 Importing prompts...');
            this.importPrompts(prompts);
        }, 100);
    }

    copyCleanJsonFromHistory(prompts) {
        this.copyCleanJson(prompts);
    }

    importJsonFromPreview(jsonId) {
        const jsonElement = document.getElementById(jsonId);
        if (!jsonElement) return;

        const preElement = jsonElement.querySelector('pre');
        if (!preElement) return;

        try {
            const jsonContent = preElement.textContent;
            const parsed = JSON.parse(jsonContent);
            
            // Close the modal first
            this.closeChatHistoryModal();
            
            // Import the prompts using the standard import flow
            this.importPromptsDirectly(parsed);
            
        } catch (error) {
            console.error('Error importing JSON from preview:', error);
            alert('Error importing JSON. Please check the format.');
        }
    }

    importPromptsDirectly(prompts) {
        try {
            // Create or get the prompt importer instance
            if (!window.promptImporterInstance) {
                window.promptImporterInstance = new PromptImporter();
            }
            
            // Set the prompts and import them
            window.promptImporterInstance.parsedPrompts = prompts;
            window.promptImporterInstance.importPrompts();
            
            // Show success notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                font-weight: 500;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s ease;
            `;
            notification.textContent = `✅ Imported ${prompts.length} prompts to Prompt Generation module`;
            document.body.appendChild(notification);
            
            // Auto-hide notification
            setTimeout(() => {
                notification.style.transform = 'translateY(-100%)';
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
            
        } catch (error) {
            console.error('Import error:', error);
            alert('❌ Import failed. Check console for details.');
        }
    }

    showJsonImportDialog(jsonData) {
        const message = `Found ${jsonData.length} prompts. Import them to the prompt generator?`;
        if (confirm(message)) {
            // Try to use existing import functionality
            if (window.promptImporter && window.promptImporter.importPrompts) {
                window.promptImporter.importPrompts(jsonData);
            } else {
                console.log('Imported JSON:', jsonData);
                alert(`${jsonData.length} prompts imported successfully!`);
            }
        }
    }

    restoreSelectedChat() {
        const previewActions = document.getElementById('chat-preview-actions');
        if (!previewActions || !previewActions.dataset.sessionId) return;

        const sessionId = previewActions.dataset.sessionId;
        this.loadSession(sessionId);
        this.closeChatHistoryModal();
    }

    deleteSelectedChat() {
        const previewActions = document.getElementById('chat-preview-actions');
        if (!previewActions || !previewActions.dataset.sessionId) return;

        const sessionId = previewActions.dataset.sessionId;
        if (confirm('Are you sure you want to delete this chat session?')) {
            if (this.deleteSession(sessionId)) {
                this.populateChatSessions(); // Refresh the list
                // Clear preview
                const previewContent = document.getElementById('chat-preview-content');
                const previewTitle = document.getElementById('chat-preview-title');
                const previewActions = document.getElementById('chat-preview-actions');
                
                if (previewContent && previewTitle && previewActions) {
                    previewTitle.textContent = 'Select a chat to view';
                    previewActions.style.display = 'none';
                    previewContent.innerHTML = '<div class="chat-preview-empty"><i class="fas fa-comments"></i><div>Select a chat session from the left to preview it here</div></div>';
                }
            }
        }
    }

    // === CHAT HISTORY AUTO-SAVE FUNCTIONALITY ===
    
    generateSessionId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    startNewSession() {
        this.currentSessionId = this.generateSessionId();
        console.log('Started new chat session:', this.currentSessionId);
    }

    saveCurrentSession() {
        if (!this.currentSessionId || this.messages.length === 0) return;

        const sessionData = {
            id: this.currentSessionId,
            title: this.generateSessionTitle(),
            messages: [...this.messages],
            timestamp: Date.now(),
            model: this.currentModel
        };

        // Get existing sessions
        const existingSessions = this.getSavedSessions();
        
        // Add or update current session
        const existingIndex = existingSessions.findIndex(s => s.id === this.currentSessionId);
        if (existingIndex >= 0) {
            existingSessions[existingIndex] = sessionData;
        } else {
            existingSessions.unshift(sessionData); // Add to beginning
        }

        // Trim to max limit
        const trimmedSessions = existingSessions.slice(0, this.maxStoredChats);

        // Save to localStorage
        try {
            localStorage.setItem('ai-chat-history', JSON.stringify(trimmedSessions));
            console.log('Chat session auto-saved:', this.currentSessionId);
        } catch (error) {
            console.error('Failed to save chat session:', error);
        }
    }

    getSavedSessions() {
        try {
            const saved = localStorage.getItem('ai-chat-history');
            const sessions = saved ? JSON.parse(saved) : [];
            console.log('🔍 getSavedSessions: Found', sessions.length, 'sessions in localStorage');
            console.log('🔍 Raw localStorage data:', saved);
            return sessions;
        } catch (error) {
            console.error('❌ Failed to load chat sessions:', error);
            return [];
        }
    }

    generateSessionTitle() {
        if (this.messages.length === 0) return 'New Chat';
        
        // Use first user message as title, truncated
        const firstUserMessage = this.messages.find(m => m.role === 'user');
        if (firstUserMessage) {
            const content = typeof firstUserMessage.content === 'string' 
                ? firstUserMessage.content 
                : (firstUserMessage.content.text || '');
            return content.length > 50 
                ? content.substring(0, 50) + '...' 
                : content;
        }
        
        return 'New Chat';
    }

    loadSession(sessionId) {
        const sessions = this.getSavedSessions();
        const session = sessions.find(s => s.id === sessionId);
        
        if (session) {
            this.clearChat(false); // Clear without starting new session
            this.currentSessionId = sessionId;
            this.messages = [...session.messages];
            
            // Restore messages to UI
            this.restoreMessagesToUI(session.messages);
            
            // Update model if different
            if (session.model && session.model !== this.currentModel) {
                this.currentModel = session.model;
                if (this.modelSelector) {
                    this.modelSelector.value = session.model;
                }
            }
            
            console.log('Loaded chat session:', sessionId);
        }
    }

    restoreMessagesToUI(messages) {
        if (!this.chatMessages) return;
        
        messages.forEach(message => {
            this.addMessageToUI(message.content, message.role);
        });
    }

    addMessageToUI(content, role, type = 'normal') {
        // Create message element (similar to addMessage but without saving to this.messages)
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? '👤' : '🤖';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        
        if (type === 'error') {
            messageText.style.background = 'var(--error-color)';
            messageText.style.color = 'white';
        }

        // Format message content
        messageText.innerHTML = this.formatMessageContent(content);

        messageContent.appendChild(messageText);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        if (this.chatMessages) {
            this.chatMessages.appendChild(messageDiv);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    deleteSession(sessionId) {
        const sessions = this.getSavedSessions();
        const filteredSessions = sessions.filter(s => s.id !== sessionId);
        
        try {
            localStorage.setItem('ai-chat-history', JSON.stringify(filteredSessions));
            console.log('Deleted chat session:', sessionId);
            return true;
        } catch (error) {
            console.error('Failed to delete chat session:', error);
            return false;
        }
    }

    exportAllChats() {
        const sessions = this.getSavedSessions();
        const exportData = {
            exportDate: new Date().toISOString(),
            totalSessions: sessions.length,
            sessions: sessions
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-chat-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    setupAutoResize() {
        if (!this.chatInput) return;
        
        this.chatInput.addEventListener('input', () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
        });
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if ((!message && !this.currentFile) || this.isGenerating) return;

        // Prepare message content
        let messageWithFile = message;
        let userMessage = null;
        
        // Handle file if present
        if (this.currentFile) {
            console.log('🖼️ Processing file for sending:', {
                name: this.currentFile.name,
                type: this.currentFile.type,
                size: this.currentFile.size,
                source: this.currentFile.webkitRelativePath ? 'file picker' : 'clipboard/drag'
            });
            
            if (this.currentFile.type.startsWith('image/')) {
                messageWithFile += `\n\n[Image: ${this.currentFile.name}]`;
                // For image files, format for OpenAI Vision API
                const base64 = await this.fileToBase64(this.currentFile);
                console.log('🖼️ Image base64 length:', base64.length);
                console.log('🖼️ Current model:', this.currentModel);
                console.log('🖼️ Base64 starts with:', base64.substring(0, 50));
                
                // Try the original format first (data URL)
                userMessage = {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: message || "Please analyze this image and help me create prompts based on it."
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: base64,
                                detail: "low"  // Try low detail first to reduce processing load
                            }
                        }
                    ]
                };
                console.log('🖼️ Using low-detail image processing to reduce API load');
                console.log('User message with image:', JSON.stringify(userMessage, null, 2));
            } else {
                // For text files, include content directly
                const fileContent = await this.fileToText(this.currentFile);
                messageWithFile += `\n\n[File: ${this.currentFile.name}]\n${fileContent.substring(0, 1000)}${fileContent.length > 1000 ? '...' : ''}`;
                userMessage = {
                    role: 'user',
                    content: message + `\n\nFile content:\n${fileContent}`
                };
            }
        } else {
            userMessage = {
                role: 'user',
                content: message
            };
        }

        // Add user message to chat (with file info if present)
        this.addMessage(messageWithFile, 'user');
        
        // Store the actual API message format for context (important for images)
        if (this.currentFile && this.currentFile.type.startsWith('image/')) {
            // Replace the last message in history with the proper API format
            this.messages[this.messages.length - 1] = userMessage;
            console.log('🖼️ Stored API-formatted message with image in history');
        }
        
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';
        this.sendBtn.disabled = true;

        // Clear file after sending
        if (this.currentFile) {
            this.removeFile();
        }

        // Show typing indicator
        this.showTypingIndicator();
        this.isGenerating = true;

        try {
            // Get context about current app state
            const context = this.getAppContext();
            
            // Create system prompt with context
            const systemPrompt = this.createSystemPrompt(context);
            
            // Prepare messages for API
            const apiMessages = [
                { role: 'system', content: systemPrompt },
                ...this.messages.slice(-10), // Keep last 10 messages for context
                userMessage
            ];

            // Debug logging for image messages
            if (this.currentFile && this.currentFile.type.startsWith('image/')) {
                console.log('🖼️ Sending image message to API');
                console.log('🖼️ Model supports vision:', this.currentModel);
                console.log('🖼️ User message structure:', JSON.stringify(userMessage, null, 2));
                console.log('🖼️ API Messages count:', apiMessages.length);
                console.log('🖼️ Last message type:', typeof apiMessages[apiMessages.length - 1].content);
            }

            // Call OpenRouter API
            const response = await this.callAI(apiMessages);
            
            console.log('🔍 API Response received:');
            console.log('🔍 Response type:', typeof response);
            console.log('🔍 Response length:', response ? response.length : 'null/undefined');
            console.log('🔍 Response preview:', response ? response.substring(0, 200) : 'No response content');
            
            // Clear thinking message now that we have the final response
            this.clearCurrentThinkingMessage();
            
            this.hideTypingIndicator();
            this.addMessage(response, 'assistant');
            
            // Check for prompts in response and offer to import
            this.detectAndOfferPrompts(response);

        } catch (error) {
            this.clearCurrentThinkingMessage();
            this.hideTypingIndicator();
            this.addMessage(`Sorry, I encountered an error: ${error.message}`, 'assistant', 'error');
            console.error('Chat error:', error);
            console.error('🔍 Full error details:', error);
            console.error('🔍 Error name:', error.name);
            console.error('🔍 Error stack:', error.stack);
            if (error.response) {
                console.error('🔍 Response status:', error.response.status);
                console.error('🔍 Response data:', error.response.data);
            }
        } finally {
            this.isGenerating = false;
            this.updateSendButton();
        }
    }

    getAppContext() {
        // Get current Midjourney parameters (but we won't include them in prompts)
        const mjParams = this.getCurrentMJParameters();
        
        // Get selected profiles/styles
        const profiles = this.getSelectedProfiles();
        
        // Get template content based on mode
        let template = '';
        if (this.templateMode === 'current-template' && this.selectedTemplate) {
            // Use the selected template from our dropdown
            template = window.Config?.templateFormulas?.[this.selectedTemplate] || '';
        }
        
        return {
            mjParams,
            profiles,
            template,
            templateMode: this.templateMode,
            selectedTemplate: this.selectedTemplate,
            currentModule: document.querySelector('.module-content.active')?.id || 'unknown'
        };
    }

    getCurrentMJParameters() {
        const params = {};
        
        // Get all parameter values from the UI
        const paramElements = {
            'aspect-ratio': 'aspectRatio',
            'stylize-value': 'stylize',
            'chaos-value': 'chaos',
            'style-version': 'styleVersion',
            'speed-value': 'speed',
            'mode-value': 'mode',
            'version-value': 'version',
            'no-value': 'exclude',
            'style-weight-value': 'styleWeight'
        };

        Object.entries(paramElements).forEach(([elementId, paramName]) => {
            const element = document.getElementById(elementId);
            if (element && element.value) {
                params[paramName] = element.value;
            }
        });

        return params;
    }

    getSelectedProfiles() {
        // This would integrate with your style library
        const selectedProfiles = [];
        const profileElements = document.querySelectorAll('.profile-item.selected');
        
        profileElements.forEach(element => {
            const name = element.dataset.name;
            const type = element.dataset.type;
            if (name && type) {
                selectedProfiles.push({ name, type });
            }
        });

        return selectedProfiles;
    }

    createSystemPrompt(context) {
        let systemPrompt = `You are an AI assistant specialized in generating high-quality Midjourney prompts using professional cinematographic and photography principles. You help users create detailed, sophisticated image prompts through natural conversation.

CURRENT USER CONTEXT:
- Template Mode: ${context.templateMode}
- Selected Profiles: ${context.profiles.length > 0 ? JSON.stringify(context.profiles) : 'None'}`;

        // Add template context when a specific template is selected
        if (context.templateMode === 'current-template' && context.template && context.selectedTemplate) {
            const templateName = context.selectedTemplate.split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            systemPrompt += `\n- Active Template: "${templateName}"
- Template Structure: "${context.template}"

TEMPLATE USAGE INSTRUCTIONS:
You MUST follow this exact template structure for all prompts. Replace the variables in curly braces {} with appropriate content based on the user's request. The template provides the specific format, order, and style that should be maintained in every generated prompt.

For example, if the template is "{ContentBlock}; {StyleTheme}, {Medium/Technique}; palette {Color Palette}...", you should replace:
- {ContentBlock} with the main subject (e.g., "Professional headshot of a business executive")
- {StyleTheme} with the visual style (e.g., "modern corporate")
- {Medium/Technique} with the art medium (e.g., "digital photography")
- And so on for each variable in the template

MAINTAIN the template's exact punctuation, semicolons, commas, and word order.`;
        }

        systemPrompt += `

PROFESSIONAL PROMPT GENERATION GUIDELINES:

1. UNDERSTAND PROMPT GOALS AND MEDIUM
- Ask clarifying questions if the user's request or desired style is unclear
- Identify the core subject, mood, style, and purpose before crafting prompts
- **ADAPT TO REQUESTED MEDIUM**: Photography, illustration, digital art, watercolor, oil painting, vector art, 3D render, etc.
- If user wants variations, plan prompt adjustments accordingly

2. MEDIUM-SPECIFIC LANGUAGE
**For Photography/Cinematographic:**
- Include camera type and lens (e.g., "Canon EOS R5, 85mm lens")
- Specify lighting conditions (e.g., "golden hour," "soft ambient light")
- Add composition details (e.g., "rule of thirds," "candid framing")
- Include film or image texture (e.g., "Fujifilm grain," "Kodachrome")

**For Digital Illustrations:**
- Use artistic terms (e.g., "digital illustration," "concept art style")
- Specify rendering style (e.g., "painterly," "cel-shaded," "highly detailed")
- Include color palette and mood (e.g., "warm palette," "vibrant colors")

**For Traditional Art:**
- Specify medium (e.g., "watercolor painting," "oil painting," "charcoal sketch")
- Include technique details (e.g., "loose brushstrokes," "fine detail work")
- Mention artistic style (e.g., "impressionist style," "realistic rendering")

**For Vector/Graphic Design:**
- Use design terms (e.g., "vector illustration," "flat design," "isometric")
- Include style elements (e.g., "clean lines," "bold colors," "minimal style")

3. USE STYLE ANCHORS FOR CONSISTENCY
- Create a base prompt capturing style, mood, and setting
- Change only the main subject or focal element when making variations
- Maintain consistent visual style across multiple images

4. INCORPORATE RELEVANT TECHNICAL TERMS
**Photography:** Backlit, overexposed, bokeh, shallow depth of field, tilt-shift
**Digital Art:** Brush textures, digital painting, concept art, matte painting
**Traditional Art:** Canvas texture, brushwork, pigment, artistic medium
**Vector Art:** Clean lines, geometric shapes, flat colors, scalable graphics

5. BALANCE DETAIL AND BREVITY
- Include relevant descriptors but avoid overloading the prompt
- Focus on essential visual and stylistic elements for the chosen medium
- Avoid vague or generic terms that add noise

6. MEDIUM-SPECIFIC EXAMPLES:
**Photography:** "Close-up portrait of an elderly Japanese woman smiling, Canon EOS R5, 85mm lens, ambient daylight, candid framing, Fujifilm grain"
**Digital Illustration:** "Digital concept art of a medieval castle on a cliff at sunset, dramatic lighting, painterly style, warm color palette, detailed environment art"
**Watercolor:** "Watercolor painting of a tiger's eye, loose brushstrokes, soft edges, transparent washes, artistic interpretation, warm earth tones"
**Vector Art:** "Vector illustration of a modern cityscape, flat design, bold geometric shapes, clean lines, vibrant color scheme, minimalist style"

CRITICAL DO'S AND DON'TS:
✓ DO: **ADAPT language to the requested medium** (photography, illustration, painting, etc.)
✓ DO: Use appropriate technical terms for the specified art form
✓ DO: Include relevant compositional and artistic elements
✓ DO: Ask for clarification when details are missing
✗ DON'T: Add Midjourney parameters (--ar, --v, --stylize, etc.) - the app handles these
✗ DON'T: Use vague or generic descriptions
✗ DON'T: Combine multiple unrelated concepts in one prompt
✗ DON'T: Default to photography if user requests other mediums (illustration, painting, etc.)

**MEDIUM ADAPTATION:** When users request specific artistic mediums, adapt your language accordingly:
- "Generate photography prompts" → Use camera, lens, lighting terms
- "Generate illustration prompts" → Use digital art, painterly, artistic terms  
- "Generate watercolor prompts" → Use traditional painting, brush, pigment terms
- "Generate vector art prompts" → Use flat design, geometric, clean line terms
- "Mix different styles" → Combine appropriate terminology for each medium

CRITICAL OUTPUT FORMAT:
When generating prompts, you MUST end your response with prompts in this EXACT JSON format:

PROMPTS_JSON_START
{
  "prompts": [
    "First detailed cinematographic prompt with camera specs and lighting",
    "Second detailed prompt with technical photography elements",
    "Additional prompts as requested by the user (match their specified number)"
  ]
}
PROMPTS_JSON_END

FOR REASONING MODELS: After completing your thinking process, you MUST provide a clear final response that includes:
1. A brief conversational acknowledgment
2. The complete JSON block with all requested prompts - NO TRUNCATION OR ELLIPSIS (...) ALLOWED

CRITICAL TOKEN MANAGEMENT: Keep your thinking process concise to save tokens for the complete JSON output. 
Prioritize delivering the full JSON over extensive reasoning details.

CRITICAL: Your JSON output must be complete and parseable. Do NOT use "..." or "Prompt X text" or "Prompt1", "Prompt2" placeholders. 
Write out every single prompt in full detail with proper cinematographic descriptions.

ABSOLUTELY FORBIDDEN:
- "Prompt1", "Prompt2", "Prompt3" placeholders
- "..." ellipsis or truncation
- Incomplete JSON structures
- Referencing prompts without writing them out
- Running out of tokens before completing the JSON

Example of CORRECT JSON format:
PROMPTS_JSON_START
{
  "prompts": [
    "Medium-wide shot of a confident male high school teacher in a light blue shirt standing behind an oak classroom table, handing out vibrant new books from a cardboard box with blank logo area, three excited diverse students leaning forward with notebooks, Canon EOS R5, 35mm lens, warm afternoon window light, rule of thirds composition, shallow depth of field, Fujifilm grain",
    "Close-up of hands lifting a colorful book from a box containing 12 new exciting books, logo area visible on box side, Canon EOS R5, 85mm lens, backlit by window, soft amber light, shallow depth of field, bokeh effect, film grain"
  ]
}
PROMPTS_JSON_END

IMPORTANT: Generate the EXACT number of prompts the user requests. If they ask for 5 prompts, provide 5. If they ask for 10, provide 10. Always match their requested quantity. Each prompt must be a complete, detailed cinematographic description - NO PLACEHOLDERS ALLOWED.

TEMPLATE MODE BEHAVIOR:
- "Freeform": Create original, cinematographic prompts using professional photography principles
- "Current Template": ${context.templateMode === 'current-template' && context.template ? 
    `STRICTLY follow the template structure "${context.selectedTemplate}" while incorporating cinematographic elements. Use the template format: "${context.template}". Replace variables with camera-ready descriptions including lens specs, lighting, and composition details.` : 
    'No template currently selected - use freeform professional generation'}
- "General": Generate versatile, cinema-quality prompts with technical photography elements

${context.templateMode === 'current-template' && context.template ? 
    `CRITICAL TEMPLATE + CINEMATOGRAPHY REMINDER: Your prompts must follow this exact structure:
"${context.template}"

Replace each {Variable} with cinematographically-rich content including camera specs, lighting conditions, and composition details while maintaining the template's exact punctuation and structure.` :
    ''}

RESPONSE STRUCTURE:
1. First, provide helpful conversational response to the user
2. ${context.templateMode === 'current-template' && context.template ? 'Acknowledge which template you\'re using and explain how you\'ll apply cinematographic principles to it' : ''}
3. **ONLY include the JSON block with prompts if the user specifically requests prompt generation**
4. Make prompts detailed with camera specs, lighting, composition, and technical photography elements
5. Never include Midjourney parameters in the JSON prompts - focus purely on visual description

WHEN TO GENERATE PROMPTS:
- Only generate the JSON prompt block when the user explicitly asks for prompts, images, or generation
- Examples: "create prompts for...", "generate images of...", "I need prompts for...", "make prompts about..."
- Do NOT generate prompts for general questions, brainstorming, or conceptual discussions
- For brainstorming or ideas, provide conversational responses without the JSON block

IMPORTANT: Only include the JSON prompt block when explicitly requested by the user for prompt generation. All prompts should follow professional cinematographic and photography principles.`;

        return systemPrompt;
    }

    async callAI(messages) {
        console.log('Making API call with model:', this.currentModel);
        
        // Check if this is a vision request
        const hasImageContent = messages.some(msg => 
            Array.isArray(msg.content) && 
            msg.content.some(content => content.type === 'image_url')
        );
        
        console.log('🖼️ Vision request detected:', hasImageContent);
        if (hasImageContent) {
            console.log('🖼️ Full message structure being sent to API:');
            console.log(JSON.stringify(messages, null, 2));
        }
        
        // For vision requests, disable streaming as it might cause issues
        const requestBody = {
            model: this.currentModel,
            messages: messages,
            temperature: 0.8,
            max_tokens: 8000
        };
        
        // Only add streaming for non-vision requests
        if (!hasImageContent) {
            requestBody.stream = true;
        }
        
        console.log('🖼️ Request body:', JSON.stringify(requestBody, null, 2));
        
        // Use backend proxy API (supports streaming!)
        const response = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        let fullContent = '';
        let reasoning = '';
        let finalContent = '';

        // Handle streaming response
        if (requestBody.stream) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.slice(6);
                            if (jsonStr === '[DONE]') continue;

                            try {
                                const data = JSON.parse(jsonStr);
                                if (data.choices && data.choices[0] && data.choices[0].delta) {
                                    const delta = data.choices[0].delta;
                                    
                                    // Handle reasoning (thinking process)
                                    if (delta.reasoning) {
                                        reasoning += delta.reasoning;
                                        this.showThinkingProcess(reasoning);
                                    }
                                    
                                    // Handle final content
                                    if (delta.content) {
                                        finalContent += delta.content;
                                    }
                                }
                            } catch (e) {
                                // Skip invalid JSON lines
                                continue;
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        } else {
            // Non-streaming fallback
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'API call failed');
            }
            
            const data = result.data;
            
            if (data.choices && data.choices[0]) {
                const choice = data.choices[0];
                
                if (choice.message && choice.message.reasoning) {
                    reasoning = choice.message.reasoning;
                    this.showThinkingProcess(reasoning);
                }
                
                if (choice.message && choice.message.content) {
                    finalContent = choice.message.content;
                }
            }
        }

        // Extract JSON from reasoning or return final content
        let responseContent = finalContent;
        
        if (!responseContent && reasoning) {
            console.log('🔍 Searching for JSON in reasoning field...');
            
            // Method 1: Look for our specific JSON markers
            const jsonMatch = reasoning.match(/PROMPTS_JSON_START\s*(\{[\s\S]*?\})\s*PROMPTS_JSON_END/);
            if (jsonMatch) {
                responseContent = jsonMatch[1];
                console.log('✅ Extracted JSON from reasoning markers:', responseContent.substring(0, 100) + '...');
            } else {
                // Method 2: Look for JSON block with "prompts" array
                const jsonBlockMatch = reasoning.match(/```json\s*(\{[\s\S]*?"prompts"[\s\S]*?\})\s*```/);
                if (jsonBlockMatch) {
                    responseContent = jsonBlockMatch[1];
                    console.log('✅ Extracted JSON from code block:', responseContent.substring(0, 100) + '...');
                } else {
                    // Method 3: Look for any JSON object with "prompts" key (more flexible)
                    const flexibleMatch = reasoning.match(/\{[\s\S]*?"prompts"\s*:\s*\[[\s\S]*?\]\s*\}/);
                    if (flexibleMatch) {
                        responseContent = flexibleMatch[0];
                        console.log('✅ Extracted flexible JSON from reasoning:', responseContent.substring(0, 100) + '...');
                    } else {
                        // Method 4: Look for the last JSON object in the reasoning
                        const lastJsonMatch = reasoning.match(/\{[^{}]*"prompts"[^{}]*\[[^\]]*\][^{}]*\}(?![\s\S]*\{[^{}]*"prompts")/);
                        if (lastJsonMatch) {
                            responseContent = lastJsonMatch[0];
                            console.log('✅ Extracted last JSON from reasoning:', responseContent.substring(0, 100) + '...');
                        } else {
                            // Last resort: return reasoning but log that no JSON was found
                            console.log('⚠️ No JSON found in reasoning, returning raw content');
                            responseContent = reasoning;
                        }
                    }
                }
            }
        }

        console.log('🔍 API Response Summary:');
        console.log('🔍 Full content length:', fullContent.length);
        console.log('🔍 Final content length:', finalContent.length);
        if (fullContent.length === 0 && finalContent.length === 0) {
            console.error('❌ EMPTY API RESPONSE - No content returned from OpenRouter API');
            console.error('❌ This suggests an API issue, not a vision problem');
            console.error('❌ Model used:', this.currentModel);
            console.error('❌ API Key length:', this.apiKey ? this.apiKey.length : 'No API key');
            console.error('❌ Request was vision?', apiMessages.some(msg => Array.isArray(msg.content)));
        }

        return responseContent;
    }

    showThinkingProcess(reasoning) {
        // Show the full reasoning process - just clean it up slightly but don't truncate
        let thinkingContent = reasoning;
        
        // If it has ** markers, try to split by them, otherwise show the full content
        if (reasoning.includes('**')) {
            const sections = reasoning
                .split('**')
                .filter(section => section.trim() && !section.includes('*'))
                .map(point => point.trim())
                .filter(point => point.length > 10);
            
            // Show last 3 complete sections if we have them, otherwise show all
            const sectionsToShow = sections.length > 3 ? sections.slice(-3) : sections;
            thinkingContent = sectionsToShow.join('\n\n→ ');
        }
        
        if (thinkingContent.trim()) {
            // Update or create thinking message in chat ONLY (no status area duplication)
            if (!this.currentThinkingMessageId) {
                // Create new thinking message
                this.currentThinkingMessageId = 'thinking-' + Date.now();
                this.addThinkingMessage(thinkingContent);
            } else {
                // Update existing thinking message
                this.updateThinkingMessage(thinkingContent);
            }
        }
    }

    addThinkingMessage(content) {
        const messageHtml = `
            <div class="chat-message assistant-message thinking-message" data-id="${this.currentThinkingMessageId}">
                <div class="message-avatar">
                    🧠
                </div>
                <div class="message-content">
                    <div class="message-text">
                        <div style="display: flex; align-items: center; margin-bottom: 8px; color: #91e700; font-weight: 600;">
                            AI Thinking Process
                            <div class="typing-dots" style="margin-left: 12px;">
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                            </div>
                        </div>
                        <div class="thinking-content" style="white-space: pre-wrap; line-height: 1.4; color: #91e700; font-size: 13px; max-height: 300px; overflow-y: auto;">${content}</div>
                    </div>
                </div>
            </div>
        `;
        
        if (this.chatMessages) {
            this.chatMessages.insertAdjacentHTML('beforeend', messageHtml);
            this.scrollToBottom();
        }
    }

    updateThinkingMessage(content) {
        if (this.chatMessages && this.currentThinkingMessageId) {
            const thinkingMessage = this.chatMessages.querySelector(`[data-id="${this.currentThinkingMessageId}"] .thinking-content`);
            if (thinkingMessage) {
                thinkingMessage.textContent = content;
                this.scrollToBottom();
            }
        }
    }

    clearCurrentThinkingMessage() {
        if (this.chatMessages && this.currentThinkingMessageId) {
            const thinkingMessage = this.chatMessages.querySelector(`[data-id="${this.currentThinkingMessageId}"]`);
            if (thinkingMessage) {
                // Remove typing dots and finalize the thinking message
                const typingDots = thinkingMessage.querySelector('.typing-dots');
                if (typingDots) {
                    typingDots.remove();
                }
            }
            this.currentThinkingMessageId = null;
        }
    }

    async getAPIKey() {
        // Use the existing config system
        if (typeof Config !== 'undefined' && Config.OPENROUTER_API_KEY) {
            return Config.OPENROUTER_API_KEY;
        }
        
        // Fallback to localStorage
        const apiKey = localStorage.getItem('openrouter-api-key');
        if (!apiKey) {
            throw new Error('No OpenRouter API key found. Please check your configuration.');
        }
        
        return apiKey;
    }

    addMessage(content, role, type = 'normal') {
        // Start new session if this is the first message
        if (!this.currentSessionId && role === 'user') {
            this.startNewSession();
        }

        // Add to message history
        this.messages.push({ role, content });

        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? '👤' : '🤖';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        
        if (type === 'error') {
            messageText.style.background = 'var(--error-color)';
            messageText.style.color = 'white';
        }

        // Format message content (basic markdown-like formatting)
        messageText.innerHTML = this.formatMessageContent(content);

        messageContent.appendChild(messageText);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        // Auto-save session after each message
        if (this.currentSessionId) {
            setTimeout(() => this.saveCurrentSession(), 100); // Small delay to ensure UI is updated
        }
    }

    formatMessageContent(content) {
        // Basic formatting for prompts and lists
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    detectAndOfferPrompts(response) {
        console.log('🔍 DETECTING PROMPTS IN RESPONSE...'); // Enhanced debug log
        console.log('🔍 Response content:', response.substring(0, 200) + '...'); // Show first 200 chars
        
        let detectedPrompts = [];
        
        // Try multiple JSON detection methods
        // Method 1: Look for marked JSON format
        const markedJsonPattern = /PROMPTS_JSON_START\s*(\{[\s\S]*?\})\s*PROMPTS_JSON_END/;
        let match = response.match(markedJsonPattern);
        
        console.log('🔍 Marked JSON pattern match:', match ? 'FOUND' : 'NOT FOUND');
        
        if (match) {
            console.log('✅ Found marked JSON block:', match[1]);
            try {
                const jsonData = JSON.parse(match[1]);
                console.log('✅ Parsed JSON successfully:', jsonData);
                if (jsonData.prompts && Array.isArray(jsonData.prompts)) {
                    detectedPrompts = jsonData.prompts
                        .map(prompt => prompt.trim())
                        .filter(prompt => prompt && prompt.length > 10); // Only basic length check
                    console.log('✅ Parsed marked JSON prompts:', detectedPrompts);
                }
            } catch (error) {
                console.error('Error parsing marked JSON:', error);
            }
        }
        
        // Method 2: Look for plain JSON blocks with "prompts" array
        if (detectedPrompts.length === 0) {
            console.log('Trying plain JSON detection...');
            const plainJsonPattern = /\{\s*"prompts"\s*:\s*\[([\s\S]*?)\]\s*\}/;
            match = response.match(plainJsonPattern);
            
            if (match) {
                console.log('Found plain JSON block:', match[0]);
                try {
                    // Clean the JSON string by removing ellipsis and truncation artifacts
                    let cleanJson = match[0]
                        .replace(/\s*\.\.\.\s*/g, '') // Remove ellipsis
                        .replace(/,\s*\]/g, ']') // Remove trailing commas before closing brackets
                        .replace(/,\s*\}/g, '}') // Remove trailing commas before closing braces
                        .replace(/"[^"]*\.\.\.[^"]*"/g, '""') // Remove incomplete quoted strings with ellipsis
                        .replace(/\s+/g, ' ') // Normalize whitespace
                        .trim();
                    
                    console.log('Cleaned JSON:', cleanJson);
                    
                    const jsonData = JSON.parse(cleanJson);
                    if (jsonData.prompts && Array.isArray(jsonData.prompts)) {
                        detectedPrompts = jsonData.prompts
                            .map(prompt => prompt.trim())
                            .filter(prompt => prompt && prompt.length > 10); // Only basic length check
                        console.log('Parsed cleaned JSON prompts:', detectedPrompts);
                    }
                } catch (error) {
                    console.error('Error parsing cleaned JSON:', error);
                    console.log('Raw JSON string:', match[0]);
                }
            }
        }
        
        // Method 3: Try to extract any JSON-like structure containing prompts
        if (detectedPrompts.length === 0) {
            console.log('Trying flexible JSON detection...');
            const flexibleJsonPattern = /\{[^}]*"prompts"[^}]*\[[^\]]*\][^}]*\}/g;
            const matches = response.match(flexibleJsonPattern);
            
            if (matches) {
                for (const jsonStr of matches) {
                    try {
                        console.log('Trying to parse:', jsonStr);
                        // Clean the JSON string by removing ellipsis and truncation artifacts
                        let cleanJson = jsonStr
                            .replace(/\s*\.\.\.\s*/g, '') // Remove ellipsis
                            .replace(/,\s*\]/g, ']') // Remove trailing commas before closing brackets
                            .replace(/,\s*\}/g, '}') // Remove trailing commas before closing braces
                            .replace(/"[^"]*\.\.\.[^"]*"/g, '""') // Remove incomplete quoted strings with ellipsis
                            .replace(/\s+/g, ' ') // Normalize whitespace
                            .trim();
                        
                        const jsonData = JSON.parse(cleanJson);
                        if (jsonData.prompts && Array.isArray(jsonData.prompts)) {
                            detectedPrompts = jsonData.prompts
                                .map(prompt => prompt.trim())
                                .filter(prompt => prompt && prompt.length > 10); // Only basic length check
                            console.log('Parsed flexible JSON prompts:', detectedPrompts);
                            break;
                        }
                    } catch (error) {
                        console.error('Error parsing flexible JSON:', error);
                    }
                }
            }
        }
        
        // Only show prompts if we found valid image prompts through JSON
        if (detectedPrompts.length > 0) {
            detectedPrompts = [...new Set(detectedPrompts)];
            console.log('🎯 FINAL DETECTED PROMPTS:', detectedPrompts);
            console.log('🎯 CALLING showPromptImportOption with', detectedPrompts.length, 'prompts');
            this.showPromptImportOption(detectedPrompts);
        } else {
            console.log('❌ NO VALID IMAGE PROMPTS DETECTED IN RESPONSE');
            console.log('❌ Response was:', response.substring(0, 300) + '...');
        }
    }

    isValidImagePrompt(text) {
        // Validate that text looks like an actual image prompt
        if (!text || text.length < 30) return false;
        
        // Exclude common conversational phrases
        const conversationalWords = [
            'let me', 'i can', 'here are', 'would you like', 'some ideas',
            'several ideas', 'come to mind', 'think of', 'when i think',
            'you could', 'consider', 'perhaps', 'maybe', 'craft some',
            'based on these', 'visual prompts', 'catchy headlines'
        ];
        
        const lowerText = text.toLowerCase();
        if (conversationalWords.some(phrase => lowerText.includes(phrase))) {
            return false;
        }
        
        // Must contain visual/descriptive words typical of image prompts
        const visualWords = [
            'style', 'color', 'lighting', 'composition', 'atmosphere', 
            'mood', 'texture', 'background', 'portrait', 'landscape',
            'photography', 'art', 'digital', 'painting', 'drawing',
            'bright', 'dark', 'vibrant', 'soft', 'sharp', 'detailed',
            'realistic', 'abstract', 'modern', 'vintage', 'elegant',
            'dramatic', 'cinematic', 'artistic', 'beautiful', 'stunning'
        ];
        
        const hasVisualWords = visualWords.some(word => lowerText.includes(word));
        
        // Should look like a descriptive prompt, not a sentence starting with common words
        const startsWithCommonWords = /^(the|a|an|this|that|these|those|when|if|think|consider|perhaps|maybe|would|could|should|let|here|i|you|we|they)\b/i.test(text.trim());
        
        return hasVisualWords && !startsWithCommonWords;
    }

    fallbackPromptDetection(response) {
        // Original detection method as fallback
        const promptPatterns = [
            // Numbered lists with multi-line support - capture everything until next number or end
            /^(\d+)\.\s+(.+?)(?=\n\d+\.|$)/gms,
            // Bullet points with multi-line support
            /^[-*]\s+(.+?)(?=\n[-*]|$)/gms,
            // Direct prompt labels
            /(?:prompt|description):\s*(.+?)(?=\n\d+\.|$)/gims
        ];

        let detectedPrompts = [];

        promptPatterns.forEach(pattern => {
            const matches = [...response.matchAll(pattern)];
            matches.forEach(match => {
                const promptText = match[2] || match[1];
                if (promptText) {
                    const cleanPrompt = promptText.trim()
                        .replace(/^["']|["']$/g, '')
                        .replace(/\n+/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    if (cleanPrompt.length > 30 && 
                        !cleanPrompt.toLowerCase().match(/\b(prompt|generate|create|here are|following|sure|of course)\b/)) {
                        detectedPrompts.push(cleanPrompt);
                    }
                }
            });
        });

        return detectedPrompts.filter(prompt => {
            return prompt.length > 30 && !prompt.match(/\.\.\.$|,$|;$/);
        });
    }

    showPromptImportOption(prompts) {
        const lastMessage = this.chatMessages.lastElementChild;
        const messageContent = lastMessage.querySelector('.message-content');

        const promptDetection = document.createElement('div');
        promptDetection.className = 'prompt-detection';
        promptDetection.innerHTML = `
            <i class="fas fa-magic"></i>
            <span>Found ${prompts.length} prompt${prompts.length > 1 ? 's' : ''}!</span>
            <button class="import-prompts-btn" data-prompts='${JSON.stringify(prompts)}'>
                Import to Prompt Generation
            </button>
            <button class="copy-json-btn" title="Copy clean JSON for manual import">
                Copy JSON
            </button>
        `;

        // Add click handler for import button
        const importBtn = promptDetection.querySelector('.import-prompts-btn');
        importBtn.addEventListener('click', () => {
            this.importPrompts(prompts);
        });

        // Add click handler for copy JSON button
        const copyJsonBtn = promptDetection.querySelector('.copy-json-btn');
        copyJsonBtn.addEventListener('click', () => {
            this.copyCleanJson(prompts);
        });

        messageContent.appendChild(promptDetection);
    }

    copyCleanJson(prompts) {
        // Create clean JSON without any markers or extra formatting
        const cleanJson = {
            "prompts": prompts
        };
        
        const jsonString = JSON.stringify(cleanJson, null, 2);
        
        // Copy to clipboard
        navigator.clipboard.writeText(jsonString).then(() => {
            // Show success feedback
            const copyBtn = document.querySelector('.copy-json-btn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Copied!';
            copyBtn.style.background = '#4CAF50';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '';
            }, 2000);
            
            this.addStatusMessage('✅ Clean JSON copied to clipboard - ready for import!');
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            this.addStatusMessage('❌ Failed to copy to clipboard');
        });
    }

    importPrompts(prompts) {
        try {
            // Create or get the prompt importer instance
            if (!window.promptImporterInstance) {
                window.promptImporterInstance = new PromptImporter();
            }
            
            // Set the prompts and import them
            window.promptImporterInstance.parsedPrompts = prompts;
            window.promptImporterInstance.importPrompts();
            
            this.addStatusMessage(`✅ Imported ${prompts.length} prompts to Prompt Generation module`);
            
            // Hide the import button after successful import
            const lastMessage = this.chatMessages.lastElementChild;
            const promptDetection = lastMessage.querySelector('.prompt-detection');
            if (promptDetection) {
                promptDetection.style.opacity = '0.5';
                const importBtn = promptDetection.querySelector('.import-prompts-btn');
                importBtn.textContent = '✅ Imported';
                importBtn.disabled = true;
            }
            
        } catch (error) {
            console.error('Import error:', error);
            this.addStatusMessage('❌ Import failed. Check console for details.');
        }
    }

    showTypingIndicator() {
        this.chatStatus.innerHTML = `
            <div class="typing-indicator">
                <span>AI is thinking</span>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
    }

    hideTypingIndicator() {
        this.chatStatus.innerHTML = '';
    }

    addStatusMessage(message, type = 'info') {
        if (!this.chatStatus) return;
        
        this.chatStatus.textContent = message;
        this.chatStatus.className = `chat-status ${type}`;
        
        setTimeout(() => {
            this.chatStatus.textContent = '';
            this.chatStatus.className = 'chat-status';
        }, 3000);
    }

    updateSendButton() {
        const hasText = this.chatInput.value.trim().length > 0;
        this.sendBtn.disabled = (!hasText && !this.currentFile) || this.isGenerating;
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    handleFileUpload(file) {
        console.log('📁 File uploaded via:', file.webkitRelativePath ? 'file picker' : 'clipboard paste');
        console.log('📁 File details:', {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        });
        
        // Validate file
        if (!this.isValidFile(file)) {
            this.addStatusMessage('Invalid file type. Please upload images, text, JSON, or markdown files.', 'error');
            return;
        }

        // Store file reference
        this.currentFile = file;
        
        // Show preview
        this.showFilePreview(file);
        
        // Update send button state
        this.updateSendButton();
        
        this.addStatusMessage(`File "${file.name}" ready to send`);
    }

    isValidFile(file) {
        const validTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'text/plain', 'text/markdown', 'application/json'
        ];
        const validExtensions = ['.txt', '.md', '.json'];
        
        return validTypes.includes(file.type) || 
               validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    }

    async showFilePreview(file) {
        if (!this.filePreview) return;
        
        this.filePreview.style.display = 'block';
        
        if (file.type.startsWith('image/')) {
            // Show image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                this.filePreview.innerHTML = `
                    <img src="${e.target.result}" alt="Upload preview">
                    <div class="file-info">
                        <span><i class="fas fa-image"></i> ${file.name} (${this.formatFileSize(file.size)})</span>
                        <button class="remove-file" onclick="window.aiChatAssistant.removeFile()">
                            <i class="fas fa-times"></i> Remove
                        </button>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        } else {
            // Show text file preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = e.target.result.substring(0, 200) + (e.target.result.length > 200 ? '...' : '');
                this.filePreview.innerHTML = `
                    <div class="file-info">
                        <span><i class="fas fa-file-text"></i> ${file.name} (${this.formatFileSize(file.size)})</span>
                        <button class="remove-file" onclick="window.aiChatAssistant.removeFile()">
                            <i class="fas fa-times"></i> Remove
                        </button>
                    </div>
                    <div style="background: var(--bg-primary); padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
                        ${preview}
                    </div>
                `;
            };
            reader.readAsText(file);
        }
    }

    removeFile() {
        this.currentFile = null;
        if (this.filePreview) {
            this.filePreview.style.display = 'none';
            this.filePreview.innerHTML = '';
        }
        
        // Update send button state
        this.updateSendButton();
        
        // Reset file input
        if (this.fileInput) {
            this.fileInput.value = '';
        }
        
        this.addStatusMessage('File removed');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async fileToBase64(file) {
        console.log('🔄 Converting file to base64:', file.name, file.type, file.size, 'bytes');
        
        return new Promise((resolve, reject) => {
            if (file.type.startsWith('image/')) {
                console.log('🖼️ Processing image file - will resize to 1024x1024');
                // For images, resize to 1024x1024 before converting to base64
                this.resizeImageTo1024(file)
                    .then(resizedBlob => {
                        console.log('✅ Image resize completed, converting to base64');
                        const reader = new FileReader();
                        reader.onload = () => {
                            console.log('✅ Base64 conversion completed');
                            resolve(reader.result);
                        };
                        reader.onerror = (error) => {
                            console.error('❌ FileReader error during base64 conversion:', error);
                            reject(error);
                        };
                        reader.readAsDataURL(resizedBlob);
                    })
                    .catch(error => {
                        console.error('❌ Image resize failed, falling back to original file:', error);
                        // Fallback to original file if resize fails
                        const reader = new FileReader();
                        reader.onload = () => {
                            console.log('✅ Fallback base64 conversion completed');
                            resolve(reader.result);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
            } else {
                console.log('📄 Processing non-image file - direct base64 conversion');
                // For non-images, convert directly
                const reader = new FileReader();
                reader.onload = () => {
                    console.log('✅ Non-image base64 conversion completed');
                    resolve(reader.result);
                };
                reader.onerror = (error) => {
                    console.error('❌ FileReader error for non-image:', error);
                    reject(error);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    async resizeImageTo1024(file) {
        return new Promise((resolve, reject) => {
            console.log('🖼️ Starting image resize process for:', file.name);
            
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                try {
                    // Calculate dimensions to maintain aspect ratio within 1024x1024
                    const maxSize = 1024;
                    let { width, height } = img;
                    const originalWidth = width;
                    const originalHeight = height;
                    
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = (height * maxSize) / width;
                            width = maxSize;
                        } else {
                            width = (width * maxSize) / height;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw and resize the image
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            console.log(`🖼️ Image resized from ${originalWidth}x${originalHeight} to ${width}x${height}`);
                            console.log(`🖼️ File size reduced from ${file.size} to ${blob.size} bytes`);
                            resolve(blob);
                        } else {
                            console.error('❌ Failed to create blob from canvas');
                            reject(new Error('Failed to resize image - blob creation failed'));
                        }
                    }, file.type, 0.9); // 90% quality
                } catch (error) {
                    console.error('❌ Error during image resize:', error);
                    reject(error);
                }
            };
            
            img.onerror = (error) => {
                console.error('❌ Failed to load image for resizing:', error);
                reject(new Error('Failed to load image for resizing'));
            };
            
            // Create object URL from file
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            
            // Clean up object URL after loading (both success and error)
            const cleanup = () => {
                URL.revokeObjectURL(objectUrl);
                console.log('🧹 Cleaned up object URL');
            };
            
            const originalOnLoad = img.onload;
            const originalOnError = img.onerror;
            
            img.onload = function() {
                cleanup();
                originalOnLoad.call(this);
            };
            
            img.onerror = function(error) {
                cleanup();
                originalOnError.call(this, error);
            };
        });
    }

    async fileToText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    clearChat(startNewSession = true) {
        if (startNewSession && this.messages.length > 0 && !confirm('Clear all chat messages?')) {
            return;
        }

        this.messages = [];
        this.currentSessionId = null; // Reset session
        
        this.chatMessages.innerHTML = `
            <div class="chat-message assistant-message welcome-message">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <div class="message-text">
                        Hi! I'm your AI prompt generation assistant. I can help you create Midjourney prompts through natural conversation.
                        <br><br>
                        Try asking me things like:
                        <ul>
                            <li>"Create 5 prompts for a cyberpunk city"</li>
                            <li>"I need prompts for product photography"</li>
                            <li>"Make prompts more artistic and dreamy"</li>
                            <li><strong>📋 Paste screenshots directly!</strong> (Cmd/Ctrl+V)</li>
                        </ul>
                        I understand your current Midjourney parameters and style library!
                        <br><br>
                        <small style="color: var(--text-secondary);">💡 Tip: Copy any image and paste it here for instant analysis!</small>
                    </div>
                </div>
            </div>
        `;
        
        if (startNewSession) {
            this.addStatusMessage('Chat cleared');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AI Chat - it will handle missing elements gracefully
    if (window.logger) {
        logger.debug('🤖 Initializing AI Chat Assistant...');
    }
    window.aiChatAssistant = new AIChatAssistant();
    
    // Also create a shorthand reference for easier access
    window.aiChat = window.aiChatAssistant;
    
    if (window.logger) {
        logger.debug('✅ AI Chat Assistant initialized');
    }
});

// Export for global access
window.AIChatAssistant = AIChatAssistant;
