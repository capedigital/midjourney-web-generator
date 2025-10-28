/**
 * Generator Settings Module
 * Handles Midjourney and Ideogram browser automation setup
 */

class GeneratorSettings {
  constructor() {
    this.setupEventListeners();
    this.checkAuthStatus();
  }

  setupEventListeners() {
    // Midjourney setup button
    const mjSetupBtn = document.getElementById('mj-setup-btn');
    if (mjSetupBtn) {
      mjSetupBtn.addEventListener('click', () => this.setupMidjourney());
    }

    // Ideogram setup button
    const ideogramSetupBtn = document.getElementById('ideogram-setup-btn');
    if (ideogramSetupBtn) {
      ideogramSetupBtn.addEventListener('click', () => this.setupIdeogram());
    }

    // Check status buttons
    const mjStatusBtn = document.getElementById('mj-status-btn');
    if (mjStatusBtn) {
      mjStatusBtn.addEventListener('click', () => this.checkMidjourneyStatus());
    }

    const ideogramStatusBtn = document.getElementById('ideogram-status-btn');
    if (ideogramStatusBtn) {
      ideogramStatusBtn.addEventListener('click', () => this.checkIdeogramStatus());
    }
  }

  /**
   * Setup Midjourney authentication
   */
  async setupMidjourney() {
    const btn = document.getElementById('mj-setup-btn');
    const statusEl = document.getElementById('mj-auth-status');
    
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = 'Opening browser...';

    try {
      const response = await fetch('/api/midjourney/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        if (statusEl) {
          statusEl.textContent = 'Browser opened! Please log in to Midjourney.';
          statusEl.className = 'status-message info';
        }
        if (window.Utils && window.Utils.showToast) {
          window.Utils.showToast('Browser opened for Midjourney login. Please complete authentication.', 'info');
        }
        
        // Check status after a delay
        setTimeout(() => this.checkMidjourneyStatus(), 5000);
      } else {
        throw new Error(data.error || 'Setup failed');
      }
    } catch (error) {
      console.error('Error setting up Midjourney:', error);
      if (statusEl) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = 'status-message error';
      }
      if (window.Utils && window.Utils.showToast) {
        window.Utils.showToast(`Failed to setup Midjourney: ${error.message}`, 'error');
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Setup Ideogram authentication
   */
  async setupIdeogram() {
    const btn = document.getElementById('ideogram-setup-btn');
    const statusEl = document.getElementById('ideogram-auth-status');
    
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = 'Opening browser...';

    try {
      const response = await fetch('/api/ideogram/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        if (statusEl) {
          statusEl.textContent = 'Browser opened! Please log in to Ideogram.';
          statusEl.className = 'status-message info';
        }
        if (window.Utils && window.Utils.showToast) {
          window.Utils.showToast('Browser opened for Ideogram login. Please complete authentication.', 'info');
        }
        
        // Check status after a delay
        setTimeout(() => this.checkIdeogramStatus(), 5000);
      } else {
        throw new Error(data.error || 'Setup failed');
      }
    } catch (error) {
      console.error('Error setting up Ideogram:', error);
      if (statusEl) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = 'status-message error';
      }
      if (window.Utils && window.Utils.showToast) {
        window.Utils.showToast(`Failed to setup Ideogram: ${error.message}`, 'error');
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Check Midjourney authentication status
   */
  async checkMidjourneyStatus() {
    const statusEl = document.getElementById('mj-auth-status');
    const indicator = document.getElementById('mj-auth-indicator');
    
    try {
      const response = await fetch('/api/midjourney/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success && data.loggedIn) {
        if (statusEl) {
          statusEl.textContent = '✅ Authenticated';
          statusEl.className = 'status-message success';
        }
        if (indicator) {
          indicator.className = 'auth-indicator authenticated';
          indicator.textContent = '●';
        }
      } else {
        if (statusEl) {
          statusEl.textContent = '❌ Not authenticated';
          statusEl.className = 'status-message warning';
        }
        if (indicator) {
          indicator.className = 'auth-indicator not-authenticated';
          indicator.textContent = '●';
        }
      }
    } catch (error) {
      console.error('Error checking Midjourney status:', error);
      if (statusEl) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = 'status-message error';
      }
    }
  }

  /**
   * Check Ideogram authentication status
   */
  async checkIdeogramStatus() {
    const statusEl = document.getElementById('ideogram-auth-status');
    const indicator = document.getElementById('ideogram-auth-indicator');
    
    try {
      const response = await fetch('/api/ideogram/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success && data.loggedIn) {
        if (statusEl) {
          statusEl.textContent = '✅ Authenticated';
          statusEl.className = 'status-message success';
        }
        if (indicator) {
          indicator.className = 'auth-indicator authenticated';
          indicator.textContent = '●';
        }
      } else {
        if (statusEl) {
          statusEl.textContent = '❌ Not authenticated';
          statusEl.className = 'status-message warning';
        }
        if (indicator) {
          indicator.className = 'auth-indicator not-authenticated';
          indicator.textContent = '●';
        }
      }
    } catch (error) {
      console.error('Error checking Ideogram status:', error);
      if (statusEl) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = 'status-message error';
      }
    }
  }

  /**
   * Check both auth statuses on init
   */
  async checkAuthStatus() {
    await this.checkMidjourneyStatus();
    await this.checkIdeogramStatus();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.generatorSettings = new GeneratorSettings();
  });
} else {
  window.generatorSettings = new GeneratorSettings();
}
