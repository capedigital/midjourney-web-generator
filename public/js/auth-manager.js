// Authentication Manager Module
// Handles importing and managing authentication data for external services

class AuthenticationManager {
    constructor() {
        this.init();
        this.extractionScript = this.generateExtractionScript();
    }

    init() {
        console.log('🔐 Initializing Authentication Manager...');
        
        // Bind event listeners
        this.bindEvents();
        
        // Check initial authentication status
        this.checkAuthenticationStatus();
    }

    bindEvents() {
        // Copy extraction script button
        const copyScriptBtn = document.getElementById('copy-extraction-script');
        if (copyScriptBtn) {
            copyScriptBtn.addEventListener('click', () => this.copyExtractionScript());
        }

        // Import authentication data button
        const importAuthBtn = document.getElementById('import-auth-data');
        if (importAuthBtn) {
            importAuthBtn.addEventListener('click', () => this.importAuthenticationData());
        }

        // Clear authentication data button
        const clearAuthBtn = document.getElementById('clear-auth-data');
        if (clearAuthBtn) {
            clearAuthBtn.addEventListener('click', () => this.clearAuthenticationData());
        }

        // Test authentication buttons
        const testIdeogramBtn = document.getElementById('test-ideogram-auth');
        if (testIdeogramBtn) {
            testIdeogramBtn.addEventListener('click', () => this.testAuthentication('ideogram'));
        }

        // Clear specific auth buttons
        const clearIdeogramBtn = document.getElementById('clear-ideogram-auth');
        if (clearIdeogramBtn) {
            clearIdeogramBtn.addEventListener('click', () => this.clearSpecificAuth('ideogram'));
        }
    }

    generateExtractionScript() {
        return `// Complete Authentication Data Extraction Script for Ideogram
// Run this script in your browser's console while logged into ideogram.ai

console.log('🔐 Extracting complete authentication data from ideogram.ai...');

function extractCompleteAuthData() {
    const authData = {
        site: 'ideogram.ai',
        timestamp: new Date().toISOString(),
        cookies: [],
        localStorage: {},
        sessionStorage: {}
    };

    // Extract cookies
    const cookies = document.cookie.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
            return {
                name: name,
                value: value,
                domain: '.ideogram.ai',
                path: '/',
                secure: true,
                httpOnly: false,
                expirationDate: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
            };
        }
        return null;
    }).filter(Boolean);
    
    authData.cookies = cookies;

    // Extract localStorage (including Firebase auth tokens)
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            authData.localStorage[key] = value;
        }
    } catch (e) {
        console.warn('⚠️ Could not access localStorage:', e);
    }

    // Extract sessionStorage
    try {
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const value = sessionStorage.getItem(key);
            authData.sessionStorage[key] = value;
        }
    } catch (e) {
        console.warn('⚠️ Could not access sessionStorage:', e);
    }

    return authData;
}

// Extract and display results
const completeAuthData = extractCompleteAuthData();

console.log('✅ Complete authentication data extracted:');
console.log('📊 Stats:');
console.log(\`   🍪 Cookies: \${completeAuthData.cookies.length}\`);
console.log(\`   💾 LocalStorage keys: \${Object.keys(completeAuthData.localStorage).length}\`);
console.log(\`   📝 SessionStorage keys: \${Object.keys(completeAuthData.sessionStorage).length}\`);

// Check for Firebase auth specifically
const firebaseAuth = completeAuthData.localStorage['firebase:authUser:da0464495c:[DEFAULT]'];
if (firebaseAuth) {
    console.log('🔥 Firebase authentication found!');
    try {
        const authUser = JSON.parse(firebaseAuth);
        console.log(\`   👤 User: \${authUser.email || authUser.uid || 'Unknown'}\`);
    } catch (e) {
        console.log('   🔥 Firebase auth data present but could not parse');
    }
}

console.log('\\n📋 Copy this complete authentication data to your Electron app:');
console.log(JSON.stringify(completeAuthData, null, 2));

// Copy to clipboard if possible
if (navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(completeAuthData, null, 2)).then(() => {
        console.log('🎉 Complete authentication data copied to clipboard!');
    }).catch(err => {
        console.log('❌ Failed to copy to clipboard:', err);
    });
}

console.log(\`
📝 Instructions:
1. Copy the JSON output above
2. Go to your Electron app Settings → Authentication Manager
3. Paste the JSON in the authentication data textarea
4. Click "Import Authentication" 
5. Test the login in the internal browser

🔄 The data includes cookies, localStorage (Firebase tokens), and sessionStorage for complete authentication transfer.
\`);

// Return the data for programmatic access if needed
completeAuthData;`;
    }

    copyExtractionScript() {
        navigator.clipboard.writeText(this.extractionScript).then(() => {
            this.showStatus('📋 Extraction script copied to clipboard!', 'success');
            console.log('✅ Authentication extraction script copied to clipboard');
        }).catch(err => {
            this.showStatus('❌ Failed to copy script', 'error');
            console.error('❌ Failed to copy extraction script:', err);
        });
    }

    async importAuthenticationData() {
        const textarea = document.getElementById('auth-data-import');
        const authDataText = textarea?.value?.trim();

        if (!authDataText) {
            this.showStatus('⚠️ Please paste authentication data first', 'error');
            return;
        }

        try {
            this.showStatus('🔄 Processing authentication data...', 'info');
            
            const authData = JSON.parse(authDataText);
            
            // Validate the data structure
            if (!authData.cookies || !Array.isArray(authData.cookies)) {
                throw new Error('Invalid format: cookies array missing');
            }

            console.log('📥 Importing complete authentication data:', {
                cookies: authData.cookies.length,
                localStorage: Object.keys(authData.localStorage || {}).length,
                sessionStorage: Object.keys(authData.sessionStorage || {}).length
            });

            // Send complete auth data to main process
            if (window.ipcRenderer) {
                window.ipcRenderer.send('apply-complete-ideogram-auth', authData);
                this.showStatus('✅ Authentication data imported successfully!', 'success');
                
                // Update status after a short delay
                setTimeout(() => {
                    this.checkAuthenticationStatus();
                }, 1000);
                
                // Clear the textarea
                textarea.value = '';
                
            } else {
                throw new Error('IPC communication not available');
            }

        } catch (error) {
            console.error('❌ Failed to import authentication data:', error);
            this.showStatus(`❌ Import failed: ${error.message}`, 'error');
        }
    }

    clearAuthenticationData() {
        const textarea = document.getElementById('auth-data-import');
        if (textarea) {
            textarea.value = '';
            this.showStatus('🗑️ Authentication data cleared', 'info');
        }
    }

    async testAuthentication(site) {
        this.showStatus('🔄 Testing authentication...', 'info');
        
        try {
            if (site === 'ideogram') {
                // Test by trying to access Ideogram in the webview
                const webBrowser = window.webBrowserController;
                if (webBrowser && webBrowser.webview) {
                    // Navigate to ideogram and check if we're logged in
                    webBrowser.webview.src = 'https://ideogram.ai';
                    
                    // Wait a moment and then check authentication status
                    setTimeout(() => {
                        this.checkAuthenticationStatus();
                    }, 3000);
                } else {
                    this.showStatus('⚠️ Internal browser not available for testing', 'error');
                }
            }
        } catch (error) {
            console.error('❌ Authentication test failed:', error);
            this.showStatus('❌ Authentication test failed', 'error');
        }
    }

    async clearSpecificAuth(site) {
        try {
            if (site === 'ideogram') {
                this.showStatus('🗑️ Clearing Ideogram authentication...', 'info');
                
                // Send clear request to main process
                if (window.ipcRenderer) {
                    window.ipcRenderer.send('clear-ideogram-auth');
                }
                
                // Update status
                setTimeout(() => {
                    this.checkAuthenticationStatus();
                    this.showStatus('✅ Ideogram authentication cleared', 'success');
                }, 500);
            }
        } catch (error) {
            console.error('❌ Failed to clear authentication:', error);
            this.showStatus('❌ Failed to clear authentication', 'error');
        }
    }

    async checkAuthenticationStatus() {
        // This would typically check with the main process or webview
        // For now, we'll show a basic status
        const ideogramStatus = document.getElementById('ideogram-auth-status');
        
        if (ideogramStatus) {
            // We could send an IPC message to check actual auth status
            // For now, we'll show "Unknown" until we implement status checking
            ideogramStatus.textContent = 'Status Unknown';
            ideogramStatus.className = 'auth-status-badge';
        }
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('auth-import-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `import-status ${type}`;
            
            // Clear status after 5 seconds
            setTimeout(() => {
                statusElement.textContent = '';
                statusElement.className = 'import-status';
            }, 5000);
        }
        
        console.log(`🔐 Auth Manager: ${message}`);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthenticationManager();
});

// Also initialize if DOMContentLoaded already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.authManager = new AuthenticationManager();
    });
} else {
    window.authManager = new AuthenticationManager();
}
