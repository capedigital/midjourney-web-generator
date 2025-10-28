// Main application logic
class App {
    constructor() {
        logger.debug('App initializing...');
        
        this.currentUser = null;
        this.currentSession = null;
        
        const token = localStorage.getItem('token');
        if (token) {
            logger.debug('User logged in, loading user data...');
            this.loadCurrentUser();
        } else {
            logger.debug('Showing auth screen');
            this.showAuthScreen();
        }
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserSettings();
        this.setupRouting();
        logger.debug('App initialized');
    }

    setupRouting() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.module) {
                this.switchModule(event.state.module, false); // false = don't push to history
            }
        });

        // Set initial route
        const urlParams = new URLSearchParams(window.location.search);
        const module = urlParams.get('module');
        if (module) {
            this.switchModule(module, false);
        }
    }

    async loadCurrentUser() {
        try {
            const data = await window.api.getProfile();
            this.currentUser = data.user;
            
            // Update sidebar user profile
            const sidebarUserName = document.getElementById('user-name');
            const sidebarUserEmail = document.getElementById('user-email');
            if (sidebarUserName) sidebarUserName.textContent = data.user.name || data.user.email || 'User';
            if (sidebarUserEmail) sidebarUserEmail.textContent = data.user.email || '';
            
            // Update header user profile
            const headerUserName = document.getElementById('header-user-name');
            const headerUserEmail = document.getElementById('header-user-email');
            if (headerUserName) headerUserName.textContent = data.user.name || data.user.email || 'User';
            if (headerUserEmail) headerUserEmail.textContent = data.user.email || '';
            
            this.showMainScreen();
        } catch (error) {
            logger.debug('Failed to load user data, redirecting to login');
            // Token is invalid, clear it and show auth screen
            window.api.clearToken();
            this.showAuthScreen();
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
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
        const loginForm = document.getElementById('login-form');
        console.log('Login form element:', loginForm);
        if (loginForm) {
            // Remove any existing listeners and add new one
            const handleLoginSubmit = (e) => {
                console.log('Login form submitted');
                e.preventDefault();
                e.stopPropagation();
                this.handleLogin();
                return false;
            };
            loginForm.addEventListener('submit', handleLoginSubmit, true);
            
            // Also prevent default on the submit button directly
            const loginButton = loginForm.querySelector('button[type="submit"]');
            if (loginButton) {
                loginButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleLogin();
                    return false;
                });
            }
        } else {
            console.error('Login form not found!');
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            const handleRegisterSubmit = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleRegister();
                return false;
            };
            registerForm.addEventListener('submit', handleRegisterSubmit, true);
            
            // Also prevent default on the submit button directly
            const registerButton = registerForm.querySelector('button[type="submit"]');
            if (registerButton) {
                registerButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleRegister();
                    return false;
                });
            }
        } else {
            console.error('Register form not found!');
        }

        // Module navigation (using menu-item for sidebar, nav-item for legacy)
        document.querySelectorAll('.menu-item, .nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const module = e.currentTarget.dataset.module;
                this.switchModule(module);
            });
        });

        // Sidebar user profile click
        document.getElementById('sidebar-user-profile')?.addEventListener('click', () => {
            this.switchModule('settings-module');
        });

        // Header user profile click (same as sidebar)
        document.getElementById('header-user-profile')?.addEventListener('click', () => {
            this.switchModule('settings-module');
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

        // Logout buttons (sidebar and header)
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        const logoutBtnHeader = document.getElementById('logout-btn-header');
        if (logoutBtnHeader) {
            logoutBtnHeader.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Batch send to Midjourney
        const sendAllMidjourneyBtn = document.getElementById('send-all-midjourney-btn');
        console.log('🔍 sendAllMidjourneyBtn:', sendAllMidjourneyBtn);
        if (sendAllMidjourneyBtn) {
            console.log('✅ Attaching batch send listener to send-all-midjourney-btn');
            sendAllMidjourneyBtn.addEventListener('click', () => {
                console.log('🚀🚀🚀 BATCH SEND BUTTON CLICKED!');
                this.sendAllToMidjourney();
            });
        } else {
            console.error('❌ send-all-midjourney-btn not found!');
        }

        // Batch send to Ideogram
        const sendAllIdeogramBtn = document.getElementById('send-all-ideogram-btn');
        if (sendAllIdeogramBtn) {
            sendAllIdeogramBtn.addEventListener('click', () => {
                this.sendAllToIdeogram();
            });
        }
    }

    loadUserSettings() {
        // Load any user preferences from localStorage
        // This can be expanded to load theme, default AI model, etc.
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.body.classList.add(savedTheme);
        }
    }

    switchModule(moduleName, pushState = true) {
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

        // Update browser history
        if (pushState) {
            const url = new URL(window.location);
            url.searchParams.set('module', moduleName);
            window.history.pushState({ module: moduleName }, '', url);
        }

        // Load data for specific modules
        if (moduleName === 'dashboard-module') {
            this.loadDashboardStats();
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        console.log('Login attempt:', email);
        
        try {
            console.log('Calling API login...');
            const data = await window.api.login(email, password);
            console.log('Login response:', data);
            this.currentUser = data.user;
            
            // Show "access granted" message then proceed
            if (window.loginHAL) {
                window.loginHAL.showSuccess('... access granted', () => {
                    this.showMainScreen();
                    this.showToast('Welcome back!', 'success');
                });
            } else {
                this.showMainScreen();
                this.showToast('Welcome back!', 'success');
            }
        } catch (error) {
            // Stop HAL messages and show error
            if (window.loginHAL) {
                window.loginHAL.showError(error.message);
            } else {
                errorEl.textContent = error.message;
            }
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
            
            // Show "access granted" message then proceed
            if (window.registerHAL) {
                window.registerHAL.showSuccess('... access granted', () => {
                    this.showMainScreen();
                    this.showToast('Account created successfully!', 'success');
                });
            } else {
                this.showMainScreen();
                this.showToast('Account created successfully!', 'success');
            }
        } catch (error) {
            // Stop HAL messages and show error
            if (window.registerHAL) {
                window.registerHAL.showError(error.message);
            } else {
                errorEl.textContent = error.message;
            }
        }
    }

    handleLogout() {
        window.api.clearToken();
        this.currentUser = null;
        this.currentSession = null;
        this.showAuthScreen();
    }

    handleLogout() {
        window.api.clearToken();
        this.currentUser = null;
        this.currentSession = null;
        this.showAuthScreen();
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('main-screen').classList.add('hidden');
    }

    async loadSession(sessionId) {
        try {
            const response = await fetch(`/api/prompts/session/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                let prompts = [];
                try {
                    prompts = JSON.parse(data.prompts);
                } catch (e) {
                    prompts = data.prompts;
                }
                
                // Display the prompts
                if (window.Generator) {
                    window.Generator.displayGeneratedPrompts(prompts);
                }
                
                // Switch to prompt generation module
                this.switchModule('prompt-generation-module');
                
                window.Utils.showToast('Session loaded!', 'success');
            }
        } catch (error) {
            console.error('Error loading session:', error);
            window.Utils.showToast('Error loading session', 'error');
        }
    }

    showMainScreen() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        
        if (this.currentUser) {
            // Update sidebar user profile
            const sidebarUserName = document.getElementById('user-name');
            const sidebarUserEmail = document.getElementById('user-email');
            if (sidebarUserName) sidebarUserName.textContent = this.currentUser.name || this.currentUser.email;
            if (sidebarUserEmail) sidebarUserEmail.textContent = this.currentUser.email;
            
            // Update header user profile
            const headerUserName = document.getElementById('header-user-name');
            const headerUserEmail = document.getElementById('header-user-email');
            if (headerUserName) headerUserName.textContent = this.currentUser.name || this.currentUser.email;
            if (headerUserEmail) headerUserEmail.textContent = this.currentUser.email;
        }

        // Check if there's a module in the URL, otherwise show dashboard
        const urlParams = new URLSearchParams(window.location.search);
        const module = urlParams.get('module') || 'dashboard-module';
        this.switchModule(module);
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

            // Update stats if elements exist
            const statSessions = document.getElementById('stat-sessions');
            const statPrompts = document.getElementById('stat-prompts');
            if (statSessions) statSessions.textContent = sessions.length;
            if (statPrompts) statPrompts.textContent = totalPrompts;

            // Display recent sessions on dashboard if element exists
            const recentSessions = document.getElementById('recent-sessions');
            if (recentSessions) {
                this.displayRecentSessions(sessions.slice(0, 5));
            }
            
            // Also load recent prompts
            this.loadRecentPrompts();
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    async loadRecentPrompts() {
        try {
            const response = await fetch('/api/prompts/recent?limit=10', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.sessions) {
                this.displayRecentPrompts(data.sessions);
            }
        } catch (error) {
            console.error('Error loading recent prompts:', error);
        }
    }

    displayRecentPrompts(sessions) {
        const container = document.getElementById('recent-prompts-list');
        if (!container) return;
        
        if (sessions.length === 0) {
            container.innerHTML = '<div class="placeholder">Your recent prompts will appear here</div>';
            return;
        }

        container.innerHTML = sessions.map(session => {
            const date = new Date(session.created_at).toLocaleString();
            let prompts = [];
            try {
                prompts = JSON.parse(session.prompts);
            } catch (e) {
                prompts = [];
            }
            
            const firstPrompt = prompts[0] || 'No prompts';
            const preview = firstPrompt.substring(0, 100);
            
            return `
                <div class="recent-prompt-card" onclick="app.loadSession(${session.id})">
                    <div class="recent-prompt-preview">${preview}${firstPrompt.length > 100 ? '...' : ''}</div>
                    <div class="recent-prompt-meta">
                        <span class="recent-prompt-count">${prompts.length} prompts</span>
                        <span class="recent-prompt-date">${date}</span>
                    </div>
                </div>
            `;
        }).join('');
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
                <div class="history-item" onclick="app.loadSession(${session.id})">
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

    async sendAllToMidjourney() {
        console.log('🎯🎯🎯 sendAllToMidjourney CALLED');
        
        // Get ALL prompts (no selection needed)
        const allPrompts = [];
        document.querySelectorAll('.prompt-text').forEach(textarea => {
            if (textarea && textarea.value) {
                allPrompts.push(textarea.value);
            }
        });

        console.log('📋 All prompts:', allPrompts.length);

        if (allPrompts.length === 0) {
            window.Utils.showToast('No prompts to send', 'error');
            return;
        }

        const btn = document.getElementById('send-all-midjourney-btn');
        console.log('🔍 Looking for send-all-midjourney-btn:', btn);
        if (!btn) return;

        // Show status console
        const statusConsole = document.getElementById('batch-status-console');
        const statusLog = document.getElementById('status-log');
        const statusProgress = document.getElementById('status-progress');
        
        if (statusConsole) {
            statusConsole.style.display = 'block';
            statusLog.innerHTML = '';
            this.addStatusMessage('🚀 Initializing batch send...', 'info');
            statusProgress.textContent = `0/${allPrompts.length}`;
        }

        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Sending...`;

        try {
            this.addStatusMessage(`📋 Sending ${allPrompts.length} prompts to Midjourney`, 'info');
            
            const response = await fetch('/api/midjourney/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    prompts: allPrompts,
                    delayMs: 500 
                })
            });

            const data = await response.json();

            if (data.success) {
                const successful = data.results.filter(r => r.success).length;
                const failed = data.results.length - successful;
                
                if (statusProgress) statusProgress.textContent = `${successful}/${allPrompts.length}`;
                
                if (failed === 0) {
                    this.addStatusMessage(`✅ All ${successful} prompts sent successfully!`, 'success');
                    window.Utils.showToast(`✅ All ${successful} prompts sent!`, 'success');
                } else {
                    this.addStatusMessage(`⚠️ ${successful} succeeded, ${failed} failed`, 'warning');
                    window.Utils.showToast(`⚠️ Sent ${successful}/${allPrompts.length} prompts`, 'warning');
                }
                
                btn.innerHTML = '<i class="fas fa-check"></i> Sent!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-robot"></i> Send to Midjourney';
                    btn.disabled = false;
                }, 3000);
            } else {
                this.addStatusMessage(`❌ Failed: ${data.error}`, 'error');
                throw new Error(data.error || 'Failed to send');
            }
        } catch (error) {
            logger.error('Midjourney batch send failed:', error);
            this.addStatusMessage(`❌ Error: ${error.message}`, 'error');
            window.Utils.showToast('❌ Error: ' + error.message, 'error');
            btn.innerHTML = '<i class="fas fa-robot"></i> Send to Midjourney';
            btn.disabled = false;
        }
    }

    addStatusMessage(message, type = 'info') {
        const statusLog = document.getElementById('status-log');
        if (!statusLog) return;

        const colors = {
            info: '#888',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };

        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });

        const entry = document.createElement('div');
        entry.style.color = colors[type] || colors.info;
        entry.style.marginTop = '4px';
        entry.textContent = `[${timestamp}] ${message}`;
        
        statusLog.appendChild(entry);
        statusLog.scrollTop = statusLog.scrollHeight;
    }

    async sendAllToIdeogram() {
        // Get ALL prompts (no selection needed)
        const allPrompts = [];
        document.querySelectorAll('.prompt-text').forEach(textarea => {
            if (textarea && textarea.value) {
                allPrompts.push(textarea.value);
            }
        });

        if (allPrompts.length === 0) {
            window.Utils.showToast('No prompts to send', 'error');
            return;
        }

        const btn = document.getElementById('send-all-ideogram-btn');
        if (!btn) return;

        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Sending to Ideogram...`;

        try {
            const response = await fetch('/api/ideogram/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    prompts: allPrompts,
                    delayMs: 500 
                })
            });

            const data = await response.json();

            if (data.success) {
                const successful = data.results.filter(r => r.success).length;
                const failed = data.results.length - successful;
                
                if (failed === 0) {
                    window.Utils.showToast(`✅ All ${successful} prompts sent to Ideogram!`, 'success');
                } else {
                    window.Utils.showToast(`⚠️ Sent ${successful}/${allPrompts.length} prompts. ${failed} failed.`, 'warning');
                }
                
                btn.innerHTML = '<i class="fas fa-check"></i> Sent!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-image"></i> Send to Ideogram';
                    btn.disabled = false;
                }, 3000);
            } else {
                throw new Error(data.error || 'Failed to send');
            }
        } catch (error) {
            logger.error('Ideogram batch send failed:', error);
            window.Utils.showToast('❌ Error: ' + error.message, 'error');
            btn.innerHTML = '<i class="fas fa-image"></i> Send to Ideogram';
            btn.disabled = false;
        }
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
