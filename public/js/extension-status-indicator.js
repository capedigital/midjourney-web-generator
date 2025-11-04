/**
 * Extension Status Indicator
 * Shows connection status of Chrome Extension Bridge
 */

class ExtensionStatusIndicator {
    constructor() {
        this.createIndicator();
        this.checkStatus();
        
        // Check status every 5 seconds
        setInterval(() => this.checkStatus(), 5000);
    }
    
    createIndicator() {
        // Create indicator element
        const indicator = document.createElement('div');
        indicator.id = 'extension-status-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 10000;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        `;
        
        indicator.addEventListener('click', () => this.showSetupHelp());
        document.body.appendChild(indicator);
        
        this.indicator = indicator;
    }
    
    async checkStatus() {
        if (window.localBridge && window.localBridge.isReady && window.localBridge.isReady()) {
            this.showConnected();
        } else {
            this.showDisconnected();
        }
    }
    
    showConnected() {
        this.indicator.style.background = '#e8f5e9';
        this.indicator.style.color = '#27ae60';
        this.indicator.style.border = '1px solid #27ae60';
        this.indicator.innerHTML = `
            <div style="width: 8px; height: 8px; background: #27ae60; border-radius: 50%;"></div>
            <span><strong>Extension Connected</strong></span>
        `;
        this.indicator.title = 'Chrome Extension bridge is connected and ready';
    }
    
    showDisconnected() {
        this.indicator.style.background = '#fee';
        this.indicator.style.color = '#c0392b';
        this.indicator.style.border = '1px solid #c0392b';
        this.indicator.innerHTML = `
            <div style="width: 8px; height: 8px; background: #c0392b; border-radius: 50%;"></div>
            <span><strong>Extension Disconnected</strong></span>
            <i class="fas fa-question-circle" style="opacity: 0.7;"></i>
        `;
        this.indicator.title = 'Click for setup instructions';
    }
    
    showSetupHelp() {
        if (window.localBridge && window.localBridge.isReady && window.localBridge.isReady()) {
            return; // Already connected
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 8px; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <h2 style="margin: 0 0 16px 0; color: #2c3e50;">🌉 Extension Not Connected</h2>
                <p style="margin: 0 0 16px 0; color: #555;">To send prompts to Midjourney or Ideogram, you need to:</p>
                <ol style="margin: 0 0 20px 0; padding-left: 20px; color: #555; line-height: 1.6;">
                    <li>Install the Chrome extension (if not installed)</li>
                    <li>Start the local bridge server:<br><code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace;">npm start</code></li>
                    <li>Copy the auth token from the terminal</li>
                    <li>Click the extension icon and paste the token</li>
                    <li>Click "Connect to Bridge"</li>
                </ol>
                <button id="closeSetupModal" style="width: 100%; padding: 10px; background: #3498db; color: white; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; font-weight: 500;">
                    Got it!
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.id === 'closeSetupModal') {
                modal.remove();
            }
        });
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.extensionStatus = new ExtensionStatusIndicator();
    });
} else {
    window.extensionStatus = new ExtensionStatusIndicator();
}
