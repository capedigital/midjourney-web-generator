/**
 * OpenRouter API Key Settings Manager
 * Handles UI for users to manage their personal OpenRouter API key
 */

class OpenRouterKeyManager {
  constructor() {
    this.apiKeyInput = null;
    this.toggleButton = null;
    this.saveButton = null;
    this.statusElement = null;
    this.isVisible = false;
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    // Get DOM elements
    this.apiKeyInput = document.getElementById('openrouter-api-key-input');
    this.toggleButton = document.getElementById('toggle-api-key-visibility');
    this.saveButton = document.getElementById('save-openrouter-api-key');
    this.statusElement = document.getElementById('openrouter-key-status');

    if (!this.apiKeyInput || !this.toggleButton || !this.saveButton) {
      console.warn('OpenRouter key manager: Required elements not found');
      return;
    }

    // Setup event listeners
    this.toggleButton.addEventListener('click', () => this.toggleVisibility());
    this.saveButton.addEventListener('click', () => this.saveApiKey());
    
    // Load existing key
    this.loadApiKey();
  }

  async loadApiKey() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        this.showStatus('Please log in to manage your API key', 'info');
        return;
      }

      const response = await fetch('/api/auth/openrouter-key', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.hasKey && data.maskedKey) {
          // Show masked key
          this.apiKeyInput.value = '';
          this.apiKeyInput.placeholder = `Current: ${data.maskedKey}`;
          this.showStatus('✅ API key is configured. Enter a new key to update, or leave blank to keep current.', 'success');
        } else {
          this.apiKeyInput.placeholder = 'sk-or-v1-...';
          this.showStatus('No API key configured. Add one to enable AI features.', 'info');
        }
      } else {
        console.error('Failed to load API key:', response.status);
        this.showStatus('Failed to load API key status', 'error');
      }
    } catch (error) {
      console.error('Error loading API key:', error);
      this.showStatus('Error loading API key', 'error');
    }
  }

  async saveApiKey() {
    try {
      const apiKey = this.apiKeyInput.value.trim();
      const token = localStorage.getItem('token');

      if (!token) {
        this.showStatus('Please log in to save your API key', 'error');
        return;
      }

      // Validate format if key is provided
      if (apiKey && !apiKey.startsWith('sk-or-v1-')) {
        this.showStatus('⚠️ Invalid API key format. Should start with "sk-or-v1-"', 'error');
        return;
      }

      // Show loading
      this.showStatus('💾 Saving...', 'info');
      this.saveButton.disabled = true;

      const response = await fetch('/api/auth/openrouter-key', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          this.showStatus(`✅ ${data.message}`, 'success');
          
          // Clear input and reload to show masked version
          this.apiKeyInput.value = '';
          setTimeout(() => this.loadApiKey(), 1000);

          // Trigger credit refresh in top nav if it exists
          if (window.topNavModelSelector) {
            setTimeout(() => {
              window.topNavModelSelector.fetchCredits();
            }, 1500);
          }
        } else {
          this.showStatus('❌ Failed to save API key', 'error');
        }
      } else {
        const errorData = await response.json();
        this.showStatus(`❌ ${errorData.error || 'Failed to save API key'}`, 'error');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      this.showStatus('❌ Error saving API key', 'error');
    } finally {
      this.saveButton.disabled = false;
    }
  }

  toggleVisibility() {
    this.isVisible = !this.isVisible;
    
    if (this.isVisible) {
      this.apiKeyInput.type = 'text';
      this.toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
      this.toggleButton.title = 'Hide API Key';
    } else {
      this.apiKeyInput.type = 'password';
      this.toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
      this.toggleButton.title = 'Show API Key';
    }
  }

  showStatus(message, type = 'info') {
    if (!this.statusElement) return;

    // Color based on type
    const colors = {
      success: '#48bb78',
      error: '#f56565',
      info: '#888',
      warning: '#ed8936'
    };

    this.statusElement.textContent = message;
    this.statusElement.style.color = colors[type] || colors.info;
  }
}

// Initialize when script loads
if (typeof window !== 'undefined') {
  window.openRouterKeyManager = new OpenRouterKeyManager();
}
