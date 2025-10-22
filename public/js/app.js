// Main application logic
class App {
    constructor() {
        this.currentUser = null;
        this.currentSession = null;
        this.init();
    }

    init() {
        // Check if user is already logged in
        if (window.api.token) {
            this.showMainScreen();
            this.loadHistory();
        } else {
            this.showAuthScreen();
        }

        this.setupEventListeners();
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

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Generate prompts
        document.getElementById('generate-btn').addEventListener('click', () => {
            this.handleGenerate();
        });

        // Copy all prompts
        document.getElementById('copy-all-btn').addEventListener('click', () => {
            this.copyAllPrompts();
        });

        // Copy session link
        document.getElementById('copy-session-link').addEventListener('click', () => {
            this.copySessionLink();
        });
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        try {
            const data = await window.api.login(email, password);
            this.currentUser = data.user;
            this.showMainScreen();
            this.loadHistory();
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
            this.loadHistory();
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
            alert('Please enter a prompt');
            return;
        }

        try {
            generateBtn.disabled = true;
            loading.classList.remove('hidden');
            promptsContainer.classList.add('hidden');

            const data = await window.api.generatePrompts(promptText, model);
            this.currentSession = data;
            
            this.displayPrompts(data.prompts, data.sessionId);
            this.loadHistory(); // Refresh history
        } catch (error) {
            alert('Error generating prompts: ' + error.message);
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
            alert('Prompt copied!');
        });
    }

    copyAllPrompts() {
        if (!this.currentSession) return;
        
        const allPrompts = this.currentSession.prompts.join('\n\n');
        navigator.clipboard.writeText(allPrompts).then(() => {
            alert('All prompts copied!');
        });
    }

    copySessionLink() {
        if (!this.currentSession) return;
        
        const link = `${window.location.origin}/api/prompts/session/${this.currentSession.sessionId}`;
        navigator.clipboard.writeText(link).then(() => {
            alert('Session link copied! Share this with Claude Desktop.');
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
            list.innerHTML = '<p style="color: var(--text-secondary);">No sessions yet. Generate some prompts to get started!</p>';
            return;
        }

        list.innerHTML = sessions.map(session => {
            const date = new Date(session.created_at).toLocaleString();
            const preview = session.input_text.substring(0, 100) + '...';
            const promptCount = JSON.parse(session.prompts).length;
            
            return `
                <div class="history-item" onclick="app.loadSession(${session.id})">
                    <div class="history-item-header">
                        <strong>${promptCount} prompts generated</strong>
                        <span class="history-item-date">${date}</span>
                    </div>
                    <div class="history-item-preview">${preview}</div>
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
        } catch (error) {
            alert('Error loading session: ' + error.message);
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
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
