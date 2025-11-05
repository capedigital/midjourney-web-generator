/**
 * Local Bridge UI Manager
 * Manages connection status display and settings
 */

class LocalBridgeUI {
    constructor() {
        this.statusIndicator = null;
        this.init();
    }

    init() {
        // Create status indicator in top nav
        this.createStatusIndicator();
        
        // Listen to bridge events
        window.localBridge.on('onConnect', () => {
            this.updateStatus('connected');
        });
        
        window.localBridge.on('onDisconnect', () => {
            this.updateStatus('disconnected');
        });
        
        window.localBridge.on('onExtensionStatus', (available) => {
            this.updateStatus(available ? 'ready' : 'connected');
        });
        
        // Check initial status
        setTimeout(() => this.updateStatus(), 100);
    }

    createStatusIndicator() {
        // Find the model selector to place indicator before it
        const modelSelector = document.getElementById('top-nav-model-selector');
        
        if (!modelSelector) {
            console.warn('Could not find model selector for status indicator');
            return;
        }

        const indicator = document.createElement('div');
        indicator.id = 'local-bridge-status';
        indicator.className = 'local-bridge-status';
        indicator.innerHTML = `
            <div class="status-dot"></div>
            <span class="status-text">Local Bridge</span>
        `;
        
        indicator.addEventListener('click', () => this.showSettings());
        
        // Insert BEFORE the model selector so everything stays flush right
        modelSelector.parentNode.insertBefore(indicator, modelSelector);
        this.statusIndicator = indicator;
        
        // Add styles
        this.addStyles();
    }

    updateStatus(status) {
        if (!this.statusIndicator) return;
        
        const actualStatus = status || (window.localBridge.isReady() ? 'ready' : 
                                       window.localBridge.authenticated ? 'connected' :
                                       window.localBridge.connected ? 'connecting' : 'disconnected');
        
        this.statusIndicator.className = 'local-bridge-status status-' + actualStatus;
        
        const messages = {
            'disconnected': 'Disconnected',
            'connecting': 'Connecting...',
            'connected': 'Connected',
            'ready': 'Extension Ready'
        };
        
        const text = this.statusIndicator.querySelector('.status-text');
        if (text) {
            text.textContent = messages[actualStatus] || 'Unknown';
        }
        
        // Update tooltip
        this.statusIndicator.title = actualStatus === 'ready' 
            ? 'Click to configure • Extension connected and ready'
            : actualStatus === 'connected'
            ? 'Click to configure • Waiting for extension'
            : 'Click to configure • Not connected';
    }

    showSettings() {
        const currentToken = localStorage.getItem('local-bridge-token') || '';
        const status = window.localBridge.getStatus();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content local-bridge-settings">
                <div class="modal-header">
                    <h2>🌉 Local Bridge Settings</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                
                <div class="modal-body">
                    <div class="settings-section">
                        <h3>Connection Status</h3>
                        <div class="status-grid">
                            <div class="status-item ${status.connected ? 'status-ok' : ''}">
                                <span class="status-icon">${status.connected ? '✅' : '❌'}</span>
                                <span>WebSocket Connected</span>
                            </div>
                            <div class="status-item ${status.authenticated ? 'status-ok' : ''}">
                                <span class="status-icon">${status.authenticated ? '✅' : '❌'}</span>
                                <span>Authenticated</span>
                            </div>
                            <div class="status-item ${status.extensionAvailable ? 'status-ok' : ''}">
                                <span class="status-icon">${status.extensionAvailable ? '✅' : '❌'}</span>
                                <span>Extension Available</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3>✨ Automatic Authentication</h3>
                        <p>The bridge now uses your Railway login - no separate tokens needed!</p>
                        <ol class="setup-steps">
                            <li>Make sure the local bridge server is running:
                                <pre><code>cd web-app/local-bridge
npm start</code></pre>
                            </li>
                            <li>Install the Chrome extension</li>
                            <li>That's it! The connection uses your login automatically</li>
                        </ol>
                    </div>
                    
                    <div class="settings-section">
                        <h3>Quick Reference</h3>
                        <p><strong>Get current token:</strong></p>
                        <pre><code>curl -s http://127.0.0.1:3001/token</code></pre>
                        
                        <p><strong>Check server status:</strong></p>
                        <pre><code>lsof -i:3001</code></pre>
                        
                        <p><strong>View logs:</strong></p>
                        <pre><code>tail -f ~/Library/Logs/local-bridge.log</code></pre>
                        
                        <p><strong>Test connection:</strong></p>
                        <pre><code>window.localBridge.debug.status()</code></pre>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    <button class="btn btn-primary" id="bridge-connect-btn">
                        ${status.connected ? 'Reconnect' : 'Connect Now'}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle connect button
        const connectBtn = modal.querySelector('#bridge-connect-btn');
        
        connectBtn.addEventListener('click', () => {
            window.localBridge.disconnect();
            window.localBridge.connect();
            
            connectBtn.textContent = 'Connecting...';
            connectBtn.disabled = true;
            
            setTimeout(() => {
                modal.remove();
            }, 1000);
        });
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    addStyles() {
        if (document.getElementById('local-bridge-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'local-bridge-styles';
        styles.textContent = `
            .local-bridge-status {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
                border: 1px solid var(--border-color, #ddd);
                background: var(--bg-secondary, #f5f5f5);
            }
            
            .local-bridge-status:hover {
                background: var(--bg-hover, #e5e5e5);
            }
            
            .local-bridge-status .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #999;
            }
            
            .local-bridge-status.status-disconnected .status-dot {
                background: #e74c3c;
            }
            
            .local-bridge-status.status-connecting .status-dot {
                background: #f39c12;
                animation: pulse 1s infinite;
            }
            
            .local-bridge-status.status-connected .status-dot {
                background: #3498db;
            }
            
            .local-bridge-status.status-ready .status-dot {
                background: #2ecc71;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .local-bridge-settings {
                background: var(--bg-primary, #fff);
                border-radius: 12px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--border-color, #ddd);
            }
            
            .modal-header h2 {
                margin: 0;
                font-size: 20px;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--text-secondary, #666);
                padding: 0;
                width: 30px;
                height: 30px;
            }
            
            .close-btn:hover {
                color: var(--text-primary, #000);
            }
            
            .modal-body {
                padding: 20px;
            }
            
            .modal-footer {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                padding: 20px;
                border-top: 1px solid var(--border-color, #ddd);
            }
            
            .btn {
                padding: 10px 20px;
                border-radius: 6px;
                border: none;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            }
            
            .btn-secondary {
                background: var(--bg-secondary, #f5f5f5);
                color: var(--text-primary, #000);
            }
            
            .btn-secondary:hover {
                background: var(--bg-hover, #e5e5e5);
            }
            
            .btn-primary {
                background: #4a6cf7;
                color: white;
            }
            
            .btn-primary:hover {
                background: #3a5ce7;
            }
            
            .btn-primary:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
            
            .form-input {
                width: 100%;
                padding: 10px;
                border: 1px solid var(--border-color, #ddd);
                border-radius: 6px;
                font-size: 14px;
                background: var(--bg-input, #fff);
                color: var(--text-primary, #000);
            }
            
            .settings-section {
                margin-bottom: 24px;
            }
            
            .settings-section h3 {
                margin-bottom: 12px;
                font-size: 16px;
            }
            
            .status-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 12px;
            }
            
            .status-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px;
                border-radius: 6px;
                background: var(--bg-secondary, #f5f5f5);
                border: 2px solid #ddd;
            }
            
            .status-item.status-ok {
                border-color: #2ecc71;
                background: rgba(46, 204, 113, 0.1);
            }
            
            .setup-steps {
                padding-left: 24px;
            }
            
            .setup-steps li {
                margin-bottom: 12px;
            }
            
            .setup-steps pre {
                background: #2c3e50;
                color: #ecf0f1;
                padding: 12px;
                border-radius: 4px;
                margin-top: 8px;
                overflow-x: auto;
            }
            
            .setup-steps code {
                font-family: 'Monaco', 'Menlo', monospace;
                font-size: 12px;
            }
        `;
        
        document.head.appendChild(styles);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.localBridgeUI = new LocalBridgeUI();
    });
} else {
    window.localBridgeUI = new LocalBridgeUI();
}
