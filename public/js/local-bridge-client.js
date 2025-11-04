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
            console.warn('⚠️ Not logged in - cannot connect to bridge');
            return;
        }

        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            console.log('Already connected or connecting');
            return;
        }

        console.log('🔌 Connecting to local bridge with JWT...');

        try {
            this.ws = new WebSocket('ws://127.0.0.1:3001');

            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.connected = true;
                this.reconnectAttempts = 0;
                
                // Authenticate with JWT token
                this.send({
                    type: 'auth',
                    token: this.getAuthToken(),
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
                console.log('🔌 WebSocket closed:', event.code, event.reason);
                this.connected = false;
                this.authenticated = false;
                this.extensionAvailable = false;
                
                this.trigger('onDisconnect');
                
                // Don't auto-reconnect on auth failures (code 4002)
                if (event.code === 4002) {
                    console.error('❌ Authentication failed. Please update the bridge token in settings.');
                    return;
                }
                
                // Auto-reconnect for other errors
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    setTimeout(() => this.connect(), this.reconnectDelay);
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
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
        console.log('📥 Received:', message.type);

        switch (message.type) {
            case 'auth_success':
                this.authenticated = true;
                console.log('✅ Authenticated as:', message.clientType);
                this.trigger('onConnect');
                break;

            case 'extension_status':
                this.extensionAvailable = message.available;
                console.log('🔌 Extension available:', message.available);
                this.trigger('onExtensionStatus', message.available);
                break;

            case 'prompt_result':
            case 'batch_result':
                console.log('✅ Result received:', message);
                this.trigger('onPromptResult', message);
                break;

            case 'error':
                console.error('❌ Server error:', message.message);
                break;

            case 'pong':
                // Heartbeat response
                break;

            default:
                console.warn('⚠️ Unknown message type:', message.type);
        }
    }

    send(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket not connected');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('❌ Failed to send message:', error);
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
            this.send({
                type: 'submit_batch',
                messageId: messageId,
                prompts: prompts,
                delayMs: delayMs,
                service: service
            });
            
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
}

// Create global instance
window.localBridge = new LocalBridgeClient();

// Debug helpers
window.localBridge.debug = {
    status: () => {
        console.log('Local Bridge Status:', window.localBridge.getStatus());
    },
    connect: () => {
        window.localBridge.connect();
    },
    disconnect: () => {
        window.localBridge.disconnect();
    },
    testPrompt: () => {
        window.localBridge.submitPrompt('/imagine prompt: a beautiful sunset --ar 16:9')
            .then(result => console.log('✅ Success:', result))
            .catch(error => console.error('❌ Error:', error));
    }
};

console.log('🌉 Local Bridge Client loaded');
console.log('💡 Use window.localBridge.debug.status() to check connection');
