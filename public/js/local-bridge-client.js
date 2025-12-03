/**
 * Local Bridge Client
 * Connects Railway web app to local bridge server
 */

class LocalBridgeClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.authenticated = false;
        this.extensionAvailable = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.callbacks = {
            onConnect: [],
            onDisconnect: [],
            onExtensionStatus: [],
            onPromptResult: []
        };
        
        // Auto-connect if user is logged in
        const userToken = localStorage.getItem('token');
        if (userToken) {
            this.connect();
        }
    }

    getAuthToken() {
        // Use the user's JWT token from Railway login
        return localStorage.getItem('token');
    }

    connect() {
        const token = this.getAuthToken();
        if (!token) {
            return;
        }

        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        try {
            this.ws = new WebSocket('ws://127.0.0.1:3001');

            this.ws.onopen = () => {
                console.log('🌉 Bridge: WebSocket connected to localhost:3001');
                this.connected = true;
                this.reconnectAttempts = 0;
                
                // Authenticate with JWT token
                const authToken = this.getAuthToken();
                console.log('🌉 Bridge: Sending auth as webapp...');
                this.send({
                    type: 'auth',
                    token: authToken,
                    clientType: 'webapp'
                });
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('❌ Error parsing message:', error);
                }
            };

            this.ws.onclose = (event) => {
                this.connected = false;
                this.authenticated = false;
                this.extensionAvailable = false;
                
                this.trigger('onDisconnect');
                
                // Don't auto-reconnect on auth failures (code 4002)
                if (event.code === 4002) {
                    console.error('Bridge authentication failed');
                    return;
                }
                
                // Auto-reconnect for other errors
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => this.connect(), this.reconnectDelay);
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error - Check if:', error);
                console.error('  1. Bridge server is running (lsof -i :3001)');
                console.error('  2. Brave shields are down for this site');
                console.error('  3. You are logged into the web app');
            };

        } catch (error) {
            console.error('❌ Failed to create WebSocket:', error);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'User disconnected');
            this.ws = null;
        }
        this.connected = false;
        this.authenticated = false;
        this.extensionAvailable = false;
    }

    handleMessage(message) {
        switch (message.type) {
            case 'auth_success':
                this.authenticated = true;
                this.trigger('onConnect');
                break;

            case 'extension_status':
                this.extensionAvailable = message.available;
                this.trigger('onExtensionStatus', message.available);
                break;

            case 'prompt_result':
            case 'batch_result':
                this.trigger('onPromptResult', message);
                break;

            case 'error':
                console.error('Bridge error:', message.message);
                break;

            case 'pong':
                // Heartbeat response
                break;

            default:
                console.warn('Unknown bridge message:', message.type);
        }
    }

    send(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Failed to send bridge message:', error);
            return false;
        }
    }

    submitPrompt(prompt, service = 'midjourney') {
        if (!this.authenticated || !this.extensionAvailable) {
            return Promise.reject(new Error('Extension not available'));
        }

        return new Promise((resolve, reject) => {
            const messageId = Date.now().toString();
            
            // Set up one-time listener for result
            const resultHandler = (result) => {
                if (result.messageId === messageId) {
                    this.off('onPromptResult', resultHandler);
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'Failed to submit prompt'));
                    }
                }
            };
            
            this.on('onPromptResult', resultHandler);
            
            // Send prompt
            this.send({
                type: 'submit_prompt',
                messageId: messageId,
                prompt: prompt,
                service: service
            });
            
            // Timeout after 30 seconds
            setTimeout(() => {
                this.off('onPromptResult', resultHandler);
                reject(new Error('Timeout waiting for result'));
            }, 30000);
        });
    }

    submitBatch(prompts, delayMs = 5000, service = 'midjourney') {
        if (!this.authenticated || !this.extensionAvailable) {
            return Promise.reject(new Error('Extension not available'));
        }

        return new Promise((resolve, reject) => {
            const messageId = Date.now().toString();
            
            // Set up one-time listener for result
            const resultHandler = (result) => {
                if (result.messageId === messageId) {
                    this.off('onPromptResult', resultHandler);
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'Failed to submit batch'));
                    }
                }
            };
            
            this.on('onPromptResult', resultHandler);
            
            // Send batch
            const batchMessage = {
                type: 'submit_batch',
                messageId: messageId,
                prompts: prompts,
                delayMs: delayMs,
                service: service
            };
            console.log('📤 Sending batch to extension:', batchMessage);
            this.send(batchMessage);
            
            // Timeout after 5 minutes (long batches)
            setTimeout(() => {
                this.off('onPromptResult', resultHandler);
                reject(new Error('Timeout waiting for batch result'));
            }, 300000);
        });
    }

    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    off(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
    }

    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('❌ Callback error:', error);
                }
            });
        }
    }

    isReady() {
        return this.connected && this.authenticated && this.extensionAvailable;
    }

    getStatus() {
        return {
            connected: this.connected,
            authenticated: this.authenticated,
            extensionAvailable: this.extensionAvailable,
            ready: this.isReady()
        };
    }
    
    // Debug helper
    debug() {
        const status = this.getStatus();
        console.log('🌉 Local Bridge Status:');
        console.log('  WebSocket Connected:', status.connected ? '✅' : '❌');
        console.log('  Authenticated:', status.authenticated ? '✅' : '❌');
        console.log('  Extension Available:', status.extensionAvailable ? '✅' : '❌');
        console.log('  Ready to Send:', status.ready ? '✅' : '❌');
        console.log('  Has Login Token:', !!localStorage.getItem('token') ? '✅' : '❌');
        console.log('  WebSocket State:', this.ws ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.ws.readyState] : 'NULL');
        
        if (!status.ready) {
            console.log('\n💡 Troubleshooting:');
            if (!localStorage.getItem('token')) {
                console.log('  ⚠️ Not logged in - login to the web app first');
            }
            if (!status.connected) {
                console.log('  ⚠️ Check: lsof -i :3001 (bridge server running?)');
                console.log('  ⚠️ Check: Brave shields down for this site?');
            }
            if (status.connected && !status.authenticated) {
                console.log('  ⚠️ Authentication failed - check server logs');
            }
            if (status.authenticated && !status.extensionAvailable) {
                console.log('  ⚠️ Extension not connected - reload extension');
            }
        }
        
        return status;
    }
}

// Create global instance
window.localBridge = new LocalBridgeClient();
