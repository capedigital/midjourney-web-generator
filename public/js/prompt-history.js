/**
 * Prompt History Module
 * Allows users to view, search, and reuse previously submitted prompts
 */

class PromptHistory {
    constructor() {
        this.currentPage = 1;
        this.limit = 20;
        this.totalPages = 1;
        this.sessions = [];
        this.currentFilter = 'all';
        this.currentSearch = '';
        
        this.init();
    }
    
    init() {
        console.log('🎯 Prompt History module initializing...');
        
        // Initialize when module becomes visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.id === 'prompt-history-module' && 
                    mutation.target.classList.contains('active')) {
                    console.log('👁️  Prompt History module became visible, loading history...');
                    this.loadHistory();
                }
            });
        });
        
        const module = document.getElementById('prompt-history-module');
        if (module) {
            observer.observe(module, { attributes: true, attributeFilter: ['class'] });
            console.log('✅ Prompt History observer attached');
        } else {
            console.error('❌ Prompt History module element not found');
        }
        
        // Event listeners
        this.attachEventListeners();
    }
    
    attachEventListeners() {
        // Search
        const searchInput = document.getElementById('history-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                this.currentSearch = e.target.value.trim();
                searchTimeout = setTimeout(() => {
                    this.currentPage = 1;
                    this.loadHistory();
                }, 500);
            });
        }
        
        // Filter
        const filterSelect = document.getElementById('history-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.currentPage = 1;
                this.loadHistory();
            });
        }
        
        // Refresh
        const refreshBtn = document.getElementById('refresh-history');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.currentPage = 1;
                this.loadHistory();
            });
        }
        
        // Pagination
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadHistory();
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.loadHistory();
                }
            });
        }
    }
    
    async loadHistory() {
        const listContainer = document.getElementById('history-list');
        if (!listContainer) {
            console.error('❌ History list container not found');
            return;
        }
        
        console.log('🔄 Loading prompt history...');
        listContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading history...</div>';
        
        try {
            const offset = (this.currentPage - 1) * this.limit;
            
            let url = `/api/prompts/history?limit=${this.limit}&offset=${offset}`;
            
            // If searching, use search endpoint instead
            if (this.currentSearch) {
                url = `/api/prompts/search?q=${encodeURIComponent(this.currentSearch)}&limit=${this.limit}&offset=${offset}`;
            }
            
            console.log('📡 Fetching history from:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                console.error('❌ History API error:', response.status, response.statusText);
                throw new Error('Failed to load history');
            }
            
            const data = await response.json();
            console.log('✅ History data received:', data);
            this.sessions = data.sessions || [];
            console.log(`📊 Found ${this.sessions.length} sessions`);
            
            // Calculate pagination
            if (data.pagination) {
                const total = data.pagination.total;
                this.totalPages = Math.ceil(total / this.limit);
            }
            
            // Filter by service if needed
            let filteredSessions = this.sessions;
            if (this.currentFilter !== 'all') {
                filteredSessions = this.sessions.filter(s => s.model === this.currentFilter);
            }
            
            this.renderSessions(filteredSessions);
            this.updatePagination();
            
        } catch (error) {
            console.error('Error loading history:', error);
            listContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    Failed to load history. Please try again.
                </div>
            `;
        }
    }
    
    renderSessions(sessions) {
        const listContainer = document.getElementById('history-list');
        if (!listContainer) return;
        
        if (sessions.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No History Yet</h3>
                    <p>Your prompt sessions will appear here</p>
                </div>
            `;
            return;
        }
        
        const tableHtml = `
            <table class="history-table">
                <thead>
                    <tr>
                        <th class="date-col"><i class="fas fa-calendar"></i> Date</th>
                        <th class="prompts-col"><i class="fas fa-list"></i> Prompts</th>
                        <th class="count-col"><i class="fas fa-hashtag"></i> Count</th>
                        <th class="actions-col"><i class="fas fa-tools"></i> Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${sessions.map(session => this.renderSessionRow(session)).join('')}
                </tbody>
            </table>
        `;
        
        listContainer.innerHTML = tableHtml;
        
        // Attach click handlers
        this.attachPromptHandlers();
    }
    
    renderSessionRow(session) {
        const date = new Date(session.created_at);
        const formattedDate = date.toLocaleDateString();
        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Handle prompts whether it's already an array or a JSON string
        let prompts = [];
        if (Array.isArray(session.prompts)) {
            prompts = session.prompts;
        } else if (typeof session.prompts === 'string') {
            try {
                prompts = JSON.parse(session.prompts);
            } catch (e) {
                prompts = [];
            }
        }
        
        // Get model display name with icon
        let modelDisplay = session.model || 'Unknown';
        let modelIcon = 'fa-question-circle';
        
        if (modelDisplay.includes('ideogram')) {
            modelIcon = 'fa-image';
            modelDisplay = 'Ideogram';
        } else if (modelDisplay.includes('midjourney')) {
            modelIcon = 'fa-magic';
            modelDisplay = 'Midjourney';
        } else if (modelDisplay.includes('openai') || modelDisplay.includes('gpt')) {
            modelIcon = 'fa-robot';
            modelDisplay = 'OpenAI';
        } else if (modelDisplay.includes('anthropic') || modelDisplay.includes('claude')) {
            modelIcon = 'fa-brain';
            modelDisplay = 'Claude';
        } else if (modelDisplay.includes('google') || modelDisplay.includes('gemini')) {
            modelIcon = 'fa-star';
            modelDisplay = 'Gemini';
        }
        
        // Create expandable prompts preview
        const promptPreviews = prompts.slice(0, 3).map(p => {
            const promptText = typeof p === 'string' ? p : JSON.stringify(p);
            return this.truncate(promptText, 60);
        }).join('<br>');
        
        const hasMore = prompts.length > 3;
        
        return `
            <tr class="history-row" data-session-id="${session.id}">
                <td class="date-col">
                    <div class="date-display">${formattedDate}</div>
                    <div class="time-display">${formattedTime}</div>
                </td>
                <td class="prompts-col">
                    <div class="prompts-preview">${promptPreviews}</div>
                    ${hasMore ? `<div class="more-indicator">+${prompts.length - 3} more...</div>` : ''}
                </td>
                <td class="count-col">
                    <span class="badge">${prompts.length}</span>
                </td>
                <td class="actions-col">
                    <button class="btn-icon expand-btn" data-session-id="${session.id}" title="View all prompts">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <button class="btn-icon copy-all-btn" data-session-id="${session.id}" title="Copy all prompts">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn-icon send-to-gen-btn" data-session-id="${session.id}" title="Send to Prompt Generation">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </td>
            </tr>
            <tr class="expanded-row" id="expanded-${session.id}" style="display: none;">
                <td colspan="4">
                    <div class="expanded-content">
                        <div class="prompts-list">
                            ${prompts.map((prompt, idx) => {
                                const promptText = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
                                return `
                                    <div class="prompt-item" data-prompt="${this.escapeHtml(promptText)}">
                                        <div class="prompt-number">#${idx + 1}</div>
                                        <div class="prompt-text">${this.escapeHtml(promptText)}</div>
                                        <div class="prompt-item-actions">
                                            <button class="btn-sm btn-reuse" title="Reuse this prompt">
                                                <i class="fas fa-redo"></i>
                                            </button>
                                            <button class="btn-sm btn-copy-single" title="Copy">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
    
    renderSession(session) {
        const date = new Date(session.created_at);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        const serviceIcon = this.getServiceIcon(session.model);
        const serviceLabel = this.getServiceLabel(session.model);
        
        let promptsHtml = '';
        
        if (Array.isArray(session.prompts) && session.prompts.length > 0) {
            promptsHtml = session.prompts.map((prompt, idx) => {
                // Ensure prompt is a string
                const promptText = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
                return `
                <div class="history-prompt-item" data-prompt="${this.escapeHtml(promptText)}">
                    <div class="prompt-text">${this.truncate(promptText, 150)}</div>
                    <div class="prompt-actions">
                        <button class="btn-reuse" title="Reuse this prompt">
                            <i class="fas fa-redo"></i> Reuse
                        </button>
                        <button class="btn-copy" title="Copy to clipboard">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
            `}).join('');
        } else {
            promptsHtml = '<div class="no-prompts">No prompts in this session</div>';
        }
        
        return `
            <div class="history-session" data-session-id="${session.id}">
                <div class="session-header">
                    <div class="session-info">
                        <span class="service-badge ${session.model}">
                            <i class="${serviceIcon}"></i> ${serviceLabel}
                        </span>
                        <span class="session-date">
                            <i class="fas fa-clock"></i> ${formattedDate}
                        </span>
                        <span class="prompt-count">
                            <i class="fas fa-list"></i> ${session.prompts.length} prompt${session.prompts.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
                <div class="session-prompts">
                    ${promptsHtml}
                </div>
            </div>
        `;
    }
    
    attachPromptHandlers() {
        // Row click to expand/collapse
        document.querySelectorAll('.history-row').forEach(row => {
            row.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.actions-col')) return;
                
                const sessionId = row.dataset.sessionId;
                const expandedRow = document.getElementById(`expanded-${sessionId}`);
                const expandBtn = row.querySelector('.expand-btn i');
                
                if (expandedRow.style.display === 'none') {
                    expandedRow.style.display = 'table-row';
                    expandBtn.classList.remove('fa-chevron-down');
                    expandBtn.classList.add('fa-chevron-up');
                    row.classList.add('expanded');
                } else {
                    expandedRow.style.display = 'none';
                    expandBtn.classList.remove('fa-chevron-up');
                    expandBtn.classList.add('fa-chevron-down');
                    row.classList.remove('expanded');
                }
            });
        });
        
        // Expand/collapse buttons
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sessionId = btn.dataset.sessionId;
                const row = document.querySelector(`.history-row[data-session-id="${sessionId}"]`);
                row.click();
            });
        });
        
        // Copy all prompts buttons
        document.querySelectorAll('.copy-all-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const sessionId = btn.dataset.sessionId;
                const row = document.querySelector(`[data-session-id="${sessionId}"]`);
                const expandedRow = document.getElementById(`expanded-${sessionId}`);
                
                // Get all prompts from the expanded section
                const promptItems = expandedRow.querySelectorAll('.prompt-item');
                const prompts = Array.from(promptItems).map(item => {
                    const rawPrompt = item.dataset.prompt;
                    return window.Utils.cleanPromptText(rawPrompt);
                });
                
                if (prompts.length > 0) {
                    const allPromptsText = prompts.join('\n\n---\n\n');
                    try {
                        await navigator.clipboard.writeText(allPromptsText);
                        this.showToast(`Copied ${prompts.length} prompt${prompts.length !== 1 ? 's' : ''} to clipboard!`, 'success');
                    } catch (err) {
                        this.showToast('Failed to copy prompts', 'error');
                    }
                }
            });
        });
        
        // Reuse buttons
        document.querySelectorAll('.btn-reuse').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const promptItem = e.target.closest('.prompt-item');
                const rawPrompt = promptItem.dataset.prompt;
                const cleanPrompt = window.Utils.cleanPromptText(rawPrompt);
                this.reusePrompt(cleanPrompt);
            });
        });
        
        // Copy single prompt buttons
        document.querySelectorAll('.btn-copy-single').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const promptItem = e.target.closest('.prompt-item');
                const rawPrompt = promptItem.dataset.prompt;
                const cleanPrompt = window.Utils.cleanPromptText(rawPrompt);
                
                try {
                    await navigator.clipboard.writeText(cleanPrompt);
                    this.showToast('Copied to clipboard!', 'success');
                } catch (err) {
                    this.showToast('Failed to copy', 'error');
                }
            });
        });
        
        // Send to Prompt Generation buttons
        document.querySelectorAll('.send-to-gen-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const sessionId = btn.dataset.sessionId;
                const expandedRow = document.getElementById(`expanded-${sessionId}`);
                
                // Get all prompts from the expanded section and clean them
                const promptItems = expandedRow.querySelectorAll('.prompt-item');
                const cleanPrompts = Array.from(promptItems).map(item => {
                    const rawPrompt = item.dataset.prompt;
                    return window.Utils.cleanPromptText(rawPrompt);
                });
                
                if (cleanPrompts.length > 0) {
                    this.sendToPromptGeneration(cleanPrompts);
                }
            });
        });
    }
    
    reusePrompt(prompt) {
        // Switch to prompt importer module
        const importerModule = document.getElementById('prompt-importer-module');
        const textarea = document.getElementById('prompt-import');
        
        if (importerModule && textarea) {
            // Activate prompt importer module
            document.querySelectorAll('.module-content').forEach(m => m.classList.remove('active'));
            importerModule.classList.add('active');
            
            // Set the prompt
            textarea.value = prompt;
            textarea.focus();
            
            this.showToast('Prompt loaded in Importer!', 'success');
        } else {
            // Fallback: just copy to clipboard
            navigator.clipboard.writeText(prompt).then(() => {
                this.showToast('Prompt copied to clipboard!', 'success');
            }).catch(() => {
                this.showToast('Failed to load prompt', 'error');
            });
        }
    }
    
    sendToPromptGeneration(prompts) {
        if (!prompts || prompts.length === 0) {
            this.showToast('No prompts to import', 'warning');
            return;
        }
        
        // Switch to Prompt Generation module
        if (window.app && window.app.switchModule) {
            window.app.switchModule('prompt-generation-module');
        } else {
            document.querySelectorAll('.module-content').forEach(m => m.classList.remove('active'));
            document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
            
            const promptGenModule = document.getElementById('prompt-generation-module');
            const promptGenMenuItem = document.querySelector('[data-module="prompt-generation-module"]');
            
            if (promptGenModule) promptGenModule.classList.add('active');
            if (promptGenMenuItem) promptGenMenuItem.classList.add('active');
        }
        
        // Use the same PromptImporter that AI Chat uses for consistent styling
        if (!window.promptImporterInstance) {
            window.promptImporterInstance = new PromptImporter();
        }
        
        // Set prompts and import them using the standard importer
        window.promptImporterInstance.parsedPrompts = prompts;
        window.promptImporterInstance.importPrompts();
        
        this.showToast(`Imported ${prompts.length} prompt${prompts.length !== 1 ? 's' : ''} to Prompt Generation!`, 'success');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updatePagination() {
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }
        
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        }
    }
    
    getServiceIcon(model) {
        if (model.includes('ideogram')) return 'fas fa-image';
        if (model.includes('midjourney')) return 'fas fa-magic';
        return 'fas fa-robot';
    }
    
    getServiceLabel(model) {
        if (model === 'ideogram-browser') return 'Ideogram';
        if (model === 'midjourney-browser') return 'Midjourney';
        if (model === 'ideogram-browser-batch') return 'Ideogram Batch';
        if (model === 'midjourney-browser-batch') return 'Midjourney Batch';
        return model;
    }
    
    truncate(text, maxLength) {
        // Ensure text is a string
        const str = typeof text === 'string' ? text : String(text);
        if (str.length <= maxLength) return this.escapeHtml(str);
        return this.escapeHtml(str.substring(0, maxLength)) + '...';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showToast(message, type = 'info') {
        // Reuse existing toast system if available
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.promptHistory = new PromptHistory();
});
