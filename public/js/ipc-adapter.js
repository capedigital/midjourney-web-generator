/**
 * IPC Adapter - Converts Electron IPC calls to HTTP API calls
 * This shim allows Electron app code to run in the browser
 */

// Create a mock ipcRenderer object if it doesn't exist (web environment)
if (typeof window !== 'undefined' && !window.ipcRenderer) {
    console.log('[IPC Adapter] Initializing web environment shim');
    
    window.ipcRenderer = {
        /**
         * Send a message and wait for a response (invoke pattern)
         */
        invoke: async (channel, ...args) => {
            console.log(`[IPC Adapter] invoke: ${channel}`, args);
            
            // Handle different IPC channels
            switch (channel) {
                case 'get-config':
                    // Return mock config for web
                    return {
                        openrouterApiKey: localStorage.getItem('openrouterApiKey') || '',
                        templates: JSON.parse(localStorage.getItem('templates') || '{}'),
                        profiles: JSON.parse(localStorage.getItem('profiles') || '[]')
                    };
                    
                case 'save-config':
                    // Save config to localStorage
                    if (args[0]?.openrouterApiKey) {
                        localStorage.setItem('openrouterApiKey', args[0].openrouterApiKey);
                    }
                    if (args[0]?.templates) {
                        localStorage.setItem('templates', JSON.stringify(args[0].templates));
                    }
                    return { success: true };
                    
                case 'save-profiles':
                    // Save profiles to localStorage
                    localStorage.setItem('profiles', JSON.stringify(args[0] || []));
                    return { success: true };
                    
                case 'load-profiles':
                    // Load profiles from localStorage
                    return JSON.parse(localStorage.getItem('profiles') || '[]');
                    
                case 'open-external':
                    // Open URL in new tab
                    window.open(args[0], '_blank');
                    return { success: true };
                    
                case 'read-file':
                    // Not supported in web - show message
                    console.warn('[IPC Adapter] File reading not supported in web version');
                    throw new Error('File reading not supported in web version');
                    
                case 'write-file':
                    // Not supported in web - show message
                    console.warn('[IPC Adapter] File writing not supported in web version');
                    throw new Error('File writing not supported in web version');
                    
                case 'list-thumbs':
                    // Return empty array for web
                    return [];
                    
                default:
                    console.warn(`[IPC Adapter] Unhandled IPC channel: ${channel}`);
                    return null;
            }
        },
        
        /**
         * Send a one-way message
         */
        send: (channel, ...args) => {
            console.log(`[IPC Adapter] send: ${channel}`, args);
            
            switch (channel) {
                case 'save-recent-prompts':
                    // Save to localStorage
                    localStorage.setItem('recentPrompts', JSON.stringify(args[0] || []));
                    break;
                    
                case 'log':
                    console.log('[IPC Adapter]', ...args);
                    break;
                    
                default:
                    console.warn(`[IPC Adapter] Unhandled send channel: ${channel}`);
            }
        },
        
        /**
         * Listen for messages from main process (not applicable in web)
         */
        on: (channel, callback) => {
            console.log(`[IPC Adapter] Registered listener for: ${channel}`);
            // Store listeners if needed for web-specific events
        },
        
        /**
         * Remove listener
         */
        removeListener: (channel, callback) => {
            console.log(`[IPC Adapter] Removed listener for: ${channel}`);
        }
    };
    
    console.log('[IPC Adapter] Mock ipcRenderer created for web environment');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ipcRenderer;
}
