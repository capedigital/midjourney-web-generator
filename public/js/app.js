// Main application logic
class App {
    constructor() {
        this.currentUser = null;
        this.currentSession = null;
        this.init();
    }

    init() {
        console.log('App initializing...');
        console.log('API token:', window.api?.token);
        
        // Check if user is already logged in
        if (window.api && window.api.token) {
            console.log('User logged in, showing main screen');
            this.showMainScreen();
            this.loadHistory();
        } else {
            console.log('No user logged in, showing auth screen');
            this.showAuthScreen();
        }

        this.setupEventListeners();
        console.log('App initialized');
    }

    setupEventListeners() {
        // Auth tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const tab = e.target.dataset.tab;
                document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
                document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
            });
        });

        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Module navigation (using menu-item for sidebar, nav-item for legacy)
        document.querySelectorAll('.menu-item, .nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const module = e.currentTarget.dataset.module;
                this.switchModule(module);
            });
        });

        // Quick actions (old IDs for compatibility)
        document.getElementById('quick-action-generate')?.addEventListener('click', () => {
            this.switchModule('generator-module');
        });
        
        document.getElementById('quick-action-history')?.addEventListener('click', () => {
            this.switchModule('history-module');
        });
        
        // Quick navigation buttons on dashboard (new structure)
        document.querySelectorAll('.quick-navigation .action-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetModule = btn.dataset.module;
                if (targetModule) {
                    this.switchModule(targetModule);
                }
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Generate prompts
        document.getElementById('generate-btn').addEventListener('click', () => {
            this.handleGenerate();
        });

        // Copy all prompts
        document.getElementById('copy-all-btn')?.addEventListener('click', () => {
            this.copyAllPrompts();
        });

        // Copy session link
        document.getElementById('copy-session-link')?.addEventListener('click', () => {
            this.copySessionLink();
        });
    }

    switchModule(moduleName) {
        // Update nav items (menu-item for sidebar, nav-item for legacy)
        document.querySelectorAll('.menu-item, .nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.module === moduleName);
        });

        // Update modules (module-content for new structure, module for legacy)
        document.querySelectorAll('.module-content, .module').forEach(module => {
            module.classList.remove('active');
        });
        
        // Activate the target module
        const targetModule = document.getElementById(moduleName);
        if (targetModule) {
            targetModule.classList.add('active');
        }

        // Load data for specific modules
        if (moduleName === 'history-module') {
            this.loadHistory();
        } else if (moduleName === 'dashboard-module') {
            this.loadDashboardStats();
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        try {
            const data = await window.api.login(email, password);
            this.currentUser = data.user;
            this.showMainScreen();
            this.showToast('Welcome back!', 'success');
        } catch (error) {
            errorEl.textContent = error.message;
        }
    }

    async handleRegister() {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const name = document.getElementById('register-name').value;
        const errorEl = document.getElementById('register-error');

        try {
            const data = await window.api.register(email, password, name);
            this.currentUser = data.user;
            this.showMainScreen();
            this.showToast('Account created successfully!', 'success');
        } catch (error) {
            errorEl.textContent = error.message;
        }
    }

    handleLogout() {
        window.api.clearToken();
        this.currentUser = null;
        this.currentSession = null;
        this.showAuthScreen();
    }

    async handleGenerate() {
        const promptText = document.getElementById('prompt-input').value.trim();
        const model = document.getElementById('model-select').value;
        const generateBtn = document.getElementById('generate-btn');
        const loading = document.getElementById('loading');
        const promptsContainer = document.getElementById('prompts-container');

        if (!promptText) {
            this.showToast('Please enter a prompt', 'error');
            return;
        }

        try {
            generateBtn.disabled = true;
            loading.classList.remove('hidden');
            promptsContainer.classList.add('hidden');

            const data = await window.api.generatePrompts(promptText, model);
            this.currentSession = data;
            
            this.displayPrompts(data.prompts, data.sessionId);
            this.showToast(`Generated ${data.prompts.length} prompts successfully!`, 'success');
            this.loadDashboardStats(); // Update dashboard stats
        } catch (error) {
            this.showToast('Error generating prompts: ' + error.message, 'error');
        } finally {
            generateBtn.disabled = false;
            loading.classList.add('hidden');
        }
    }

    displayPrompts(prompts, sessionId) {
        const container = document.getElementById('prompts-container');
        const list = document.getElementById('prompts-list');
        const sessionIdEl = document.getElementById('session-id');

        list.innerHTML = '';
        
        prompts.forEach((prompt, index) => {
            const item = document.createElement('div');
            item.className = 'prompt-item';
            item.innerHTML = `
                <textarea readonly>${prompt}</textarea>
                <div class="prompt-actions">
                    <button onclick="app.copyPrompt(${index})">📋 Copy</button>
                </div>
            `;
            list.appendChild(item);
        });

        sessionIdEl.textContent = sessionId;
        container.classList.remove('hidden');
    }

    copyPrompt(index) {
        const prompts = this.currentSession.prompts;
        const prompt = prompts[index];
        
        navigator.clipboard.writeText(prompt).then(() => {
            this.showToast('Prompt copied to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy prompt', 'error');
        });
    }

    copyAllPrompts() {
        if (!this.currentSession) return;
        
        const allPrompts = this.currentSession.prompts.join('\n\n');
        navigator.clipboard.writeText(allPrompts).then(() => {
            this.showToast('All prompts copied to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy prompts', 'error');
        });
    }

    copySessionLink() {
        if (!this.currentSession) return;
        
        const link = `${window.location.origin}/api/prompts/session/${this.currentSession.sessionId}`;
        navigator.clipboard.writeText(link).then(() => {
            this.showToast('Session link copied! Share this with Claude Desktop.', 'success');
        }).catch(() => {
            this.showToast('Failed to copy link', 'error');
        });
    }

    async loadHistory() {
        try {
            const data = await window.api.getHistory();
            this.displayHistory(data.sessions);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    displayHistory(sessions) {
        const list = document.getElementById('history-list');
        
        if (sessions.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 24px;">No sessions yet. Generate some prompts to get started!</p>';
            return;
        }

        list.innerHTML = sessions.map(session => {
            const date = new Date(session.created_at).toLocaleString();
            const preview = session.input_text.substring(0, 100);
            let promptCount = 0;
            try {
                promptCount = JSON.parse(session.prompts).length;
            } catch (e) {
                promptCount = 0;
            }
            
            return `
                <div class="history-item" onclick="app.loadSessionAndSwitch(${session.id})">
                    <div class="history-item-header">
                        <span class="history-item-model">${session.model || 'Midjourney'}</span>
                        <span class="history-item-date">${date}</span>
                    </div>
                    <div class="history-item-preview">${preview}${session.input_text.length > 100 ? '...' : ''}</div>
                    <div class="history-item-count">${promptCount} prompts</div>
                </div>
            `;
        }).join('');
    }

    async loadSession(sessionId) {
        try {
            const data = await window.api.getSession(sessionId);
            this.currentSession = {
                sessionId: data.id,
                prompts: JSON.parse(data.prompts)
            };
            this.displayPrompts(this.currentSession.prompts, sessionId);
            this.showToast('Session loaded successfully!', 'success');
        } catch (error) {
            this.showToast('Error loading session: ' + error.message, 'error');
        }
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('main-screen').classList.add('hidden');
    }

    showMainScreen() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        
        if (this.currentUser) {
            document.getElementById('user-name').textContent = this.currentUser.name || this.currentUser.email;
            document.getElementById('user-email').textContent = this.currentUser.email;
        }

        // Show dashboard by default
        this.switchModule('dashboard');
    }

    async loadDashboardStats() {
        try {
            const data = await window.api.getHistory();
            const sessions = data.sessions;
            
            // Calculate total prompts
            let totalPrompts = 0;
            sessions.forEach(session => {
                try {
                    const prompts = JSON.parse(session.prompts);
                    totalPrompts += prompts.length;
                } catch (e) {
                    // Skip invalid JSON
                }
            });

            // Update stats
            document.getElementById('stat-sessions').textContent = sessions.length;
            document.getElementById('stat-prompts').textContent = totalPrompts;

            // Display recent sessions on dashboard
            this.displayRecentSessions(sessions.slice(0, 5));
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    displayRecentSessions(sessions) {
        const list = document.getElementById('recent-sessions');
        
        if (sessions.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 24px;">No sessions yet. Generate some prompts to get started!</p>';
            return;
        }

        list.innerHTML = sessions.map(session => {
            const date = new Date(session.created_at).toLocaleString();
            const preview = session.input_text.substring(0, 80);
            let promptCount = 0;
            try {
                promptCount = JSON.parse(session.prompts).length;
            } catch (e) {
                promptCount = 0;
            }
            
            return `
                <div class="history-item" onclick="app.loadSessionAndSwitch(${session.id})">
                    <div class="history-item-header">
                        <span class="history-item-model">${session.model || 'Midjourney'}</span>
                        <span class="history-item-date">${date}</span>
                    </div>
                    <div class="history-item-preview">${preview}${session.input_text.length > 80 ? '...' : ''}</div>
                    <div class="history-item-count">${promptCount} prompts</div>
                </div>
            `;
        }).join('');
    }

    async loadSessionAndSwitch(sessionId) {
        await this.loadSession(sessionId);
        this.switchModule('generator');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' : 
                     'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
