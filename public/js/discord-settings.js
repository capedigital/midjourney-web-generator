/**
 * Discord Settings Module
 * Handles Discord integration settings UI and API calls
 */

const DiscordSettings = {
    /**
     * Initialize Discord settings
     */
    init() {
        this.setupEventListeners();
        this.loadSettings();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const enableCheckbox = document.getElementById('discord-enabled-checkbox');
        const testBtn = document.getElementById('test-discord-btn');
        const saveBtn = document.getElementById('save-discord-btn');

        if (enableCheckbox) {
            enableCheckbox.addEventListener('change', (e) => {
                this.toggleDiscordForm(e.target.checked);
            });
        }

        if (testBtn) {
            testBtn.addEventListener('click', () => this.testConnection());
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }
    },

    /**
     * Toggle Discord settings form visibility
     */
    toggleDiscordForm(enabled) {
        const form = document.getElementById('discord-settings-form');
        if (form) {
            form.style.display = enabled ? 'block' : 'none';
        }
    },

    /**
     * Load Discord settings from user profile
     */
    async loadSettings() {
        try {
            const token = localStorage.getItem('token');
            
            // Silently skip if not authenticated
            if (!token) {
                logger.debug('No auth token found, skipping Discord settings load');
                return;
            }

            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Silently handle 401 (not authenticated)
            if (response.status === 401) {
                logger.debug('User not authenticated, skipping Discord settings load');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to load profile');
            }

            const data = await response.json();
            const user = data.user;

            // Update UI with loaded settings
            const enableCheckbox = document.getElementById('discord-enabled-checkbox');
            const channelIdInput = document.getElementById('discord-channel-id');
            const botTokenInput = document.getElementById('discord-bot-token');

            if (enableCheckbox) {
                enableCheckbox.checked = user.discord_enabled || false;
                this.toggleDiscordForm(user.discord_enabled || false);
            }

            if (channelIdInput && user.discord_channel_id) {
                channelIdInput.value = user.discord_channel_id;
            }

            // Show placeholder if bot token is configured (backend doesn't return actual token for security)
            if (botTokenInput && user.discord_enabled && user.discord_channel_id) {
                botTokenInput.placeholder = '••••••••••••••••••••••••••••••••••••• (Token saved securely)';
            }

            logger.debug('Discord settings loaded', { enabled: user.discord_enabled });
        } catch (error) {
            logger.error('Failed to load Discord settings:', error);
            // Don't show toast on initial load failure - only log it
        }
    },

    /**
     * Test Discord connection
     */
    async testConnection() {
        const botToken = document.getElementById('discord-bot-token').value.trim();
        const channelId = document.getElementById('discord-channel-id').value.trim();

        if (!botToken || !channelId) {
            this.showToast('Please enter both bot token and channel ID', 'error');
            return;
        }

        const testBtn = document.getElementById('test-discord-btn');
        testBtn.disabled = true;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';

        try {
            const response = await fetch('/api/discord/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ botToken, channelId })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast(data.message || 'Discord connection successful!', 'success');
            } else {
                this.showToast(data.error || 'Connection failed', 'error');
            }
        } catch (error) {
            logger.error('Discord connection test failed:', error);
            this.showToast('Connection test failed: ' + error.message, 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-plug"></i> Test Connection';
        }
    },

    /**
     * Save Discord settings
     */
    async saveSettings() {
        const enabled = document.getElementById('discord-enabled-checkbox').checked;
        const botToken = document.getElementById('discord-bot-token').value.trim();
        const channelId = document.getElementById('discord-channel-id').value.trim();

        if (enabled && (!botToken || !channelId)) {
            this.showToast('Please enter both bot token and channel ID', 'error');
            return;
        }

        const saveBtn = document.getElementById('save-discord-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    discord_enabled: enabled,
                    discord_bot_token: enabled ? botToken : null,
                    discord_channel_id: enabled ? channelId : null
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Discord settings saved successfully!', 'success');
                logger.debug('Discord settings saved');
            } else {
                this.showToast(data.error || 'Failed to save settings', 'error');
            }
        } catch (error) {
            logger.error('Failed to save Discord settings:', error);
            this.showToast('Failed to save settings: ' + error.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Discord Settings';
        }
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Check if global toast function exists
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            // Fallback to console
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DiscordSettings.init());
} else {
    DiscordSettings.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiscordSettings;
}
