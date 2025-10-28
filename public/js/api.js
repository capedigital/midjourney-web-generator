// API helper functions
class API {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    }

    async login(email, password) {
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.setToken(data.token);
        return data;
    }

    async register(email, password, name) {
        const data = await this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name })
        });
        this.setToken(data.token);
        return data;
    }

    async generatePrompts(promptText, model) {
        return this.request('/api/prompts/generate', {
            method: 'POST',
            body: JSON.stringify({ promptText, model })
        });
    }

    async getSession(sessionId) {
        return this.request(`/api/prompts/session/${sessionId}`);
    }

    async getHistory() {
        return this.request('/api/prompts/history');
    }

    async getProfile() {
        return this.request('/api/auth/profile');
    }

    // Ideogram API methods
    async ideogramSetup() {
        return this.request('/api/ideogram/setup', {
            method: 'POST'
        });
    }

    async ideogramStatus() {
        return this.request('/api/ideogram/status');
    }

    async ideogramSubmit(prompt, options = {}) {
        return this.request('/api/ideogram/submit', {
            method: 'POST',
            body: JSON.stringify({ prompt, options })
        });
    }

    async ideogramBatch(prompts, delayMs = 3000) {
        return this.request('/api/ideogram/batch', {
            method: 'POST',
            body: JSON.stringify({ prompts, delayMs })
        });
    }

    async ideogramClose() {
        return this.request('/api/ideogram/close', {
            method: 'POST'
        });
    }

    // Midjourney API methods
    async midjourneySetup() {
        return this.request('/api/midjourney/setup', {
            method: 'POST'
        });
    }

    async midjourneyStatus() {
        return this.request('/api/midjourney/status');
    }

    async midjourneySubmit(prompt, options = {}) {
        return this.request('/api/midjourney/submit', {
            method: 'POST',
            body: JSON.stringify({ prompt, options })
        });
    }

    async midjourneyBatch(prompts, delayMs = 3000) {
        return this.request('/api/midjourney/batch', {
            method: 'POST',
            body: JSON.stringify({ prompts, delayMs })
        });
    }

    async midjourneyClose() {
        return this.request('/api/midjourney/close', {
            method: 'POST'
        });
    }
}

window.api = new API();
