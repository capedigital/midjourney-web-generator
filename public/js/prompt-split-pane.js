/**
 * Prompt Generation Split Pane Controller
 * Manages the split view with iframe for Midjourney/Ideogram
 */

const PromptSplitPane = {
    isActive: false,
    currentService: 'midjourney', // 'midjourney' or 'ideogram'
    midjourneyWindow: null,
    ideogramWindow: null,
    
    /**
     * Initialize the split pane functionality
     */
    init() {
        this.setupEventListeners();
        this.setupDividerResize();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Wire up Send to Midjourney button to call app's batch send function
        const midjourneyBtn = document.getElementById('send-midjourney-btn');
        if (midjourneyBtn) {
            midjourneyBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Call the app's send function
                if (window.app && window.app.sendAllToMidjourney) {
                    await window.app.sendAllToMidjourney();
                } else {
                    console.error('App sendAllToMidjourney function not found');
                    this.showNotification('Error: Send function not available', 'error');
                }
            });
        }

        // Wire up Send to Ideogram button
        const ideogramBtn = document.getElementById('send-ideogram-btn');
        if (ideogramBtn) {
            ideogramBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Call the app's send function
                if (window.app && window.app.sendAllToIdeogram) {
                    await window.app.sendAllToIdeogram();
                } else {
                    console.error('App sendAllToIdeogram function not found');
                    this.showNotification('Error: Send function not available', 'error');
                }
            });
        }

        // Wire up Close Midjourney Browser button
        const closeMidjourneyBtn = document.getElementById('close-midjourney-browser-btn');
        if (closeMidjourneyBtn) {
            closeMidjourneyBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (window.closeMidjourneyBrowser) {
                    await window.closeMidjourneyBrowser();
                } else {
                    console.error('closeMidjourneyBrowser function not found');
                    this.showNotification('Error: Close function not available', 'error');
                }
            });
        }

        // Wire up Close Ideogram Browser button
        const closeIdeogramBtn = document.getElementById('close-ideogram-browser-btn');
        if (closeIdeogramBtn) {
            closeIdeogramBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (window.closeIdeogramBrowser) {
                    await window.closeIdeogramBrowser();
                } else {
                    console.error('closeIdeogramBrowser function not found');
                    this.showNotification('Error: Close function not available', 'error');
                }
            });
        }
    },

    /**
     * Setup divider resize functionality
     * (Kept for future CDP implementation)
     */
    setupDividerResize() {
        // Reserved for future split pane with CDP
    },

    /**
     * Toggle split view on/off
     * (Kept for future CDP implementation)
     */
    toggleSplitView() {
        // Reserved for future split pane with CDP
    },

    /**
     * Open split view with specified service
     * @param {string} service - 'midjourney' or 'ideogram'
     */
    openSplitView(service = 'midjourney') {
        this.currentService = service;
        this.isActive = true;

        const url = service === 'midjourney' 
            ? 'https://www.midjourney.com' 
            : 'https://ideogram.ai';

        // Open service in a new tab
        window.open(url, '_blank');

        // Show notification
        this.showNotification(
            `${service === 'midjourney' ? 'Midjourney' : 'Ideogram'} opened in new tab. Log in and keep it open while using the app.`,
            'success'
        );

        console.log(`${service} opened in new browser tab`);
        
        // Note: We're not actually using split view anymore, but keeping the method
        // for potential future use with Puppeteer CDP connection
    },

    /**
     * Close split view
     * (Kept for future CDP implementation)
     */
    closeSplitView() {
        // Reserved for future split pane with CDP
    },

    /**
     * Refresh the iframe
     * (Kept for future CDP implementation)
     */
    refreshIframe() {
        // Reserved for future split pane with CDP
    },

    /**
     * Navigate iframe to home page
     * (Kept for future CDP implementation)
     */
    goToHome() {
        // Reserved for future split pane with CDP
    },

    /**
     * Get selected prompts from the UI
     */
    getSelectedPrompts() {
        const promptElements = document.querySelectorAll('.prompt-item input[type="checkbox"]:checked');
        const prompts = [];
        
        promptElements.forEach(checkbox => {
            const promptContainer = checkbox.closest('.prompt-item');
            const promptText = promptContainer?.querySelector('.prompt-text')?.textContent;
            if (promptText) {
                prompts.push(promptText.trim());
            }
        });

        return prompts;
    },

    /**
     * Copy prompt to clipboard with visual feedback
     * @param {string} prompt - The prompt text to copy
     */
    async copyPromptToClipboard(prompt) {
        try {
            await navigator.clipboard.writeText(prompt);
            
            // Show notification
            this.showNotification('Prompt copied! Paste it in ' + 
                (this.currentService === 'midjourney' ? 'Midjourney' : 'Ideogram'), 
                'success');
            
            return true;
        } catch (error) {
            console.error('Failed to copy prompt:', error);
            this.showNotification('Failed to copy prompt to clipboard', 'error');
            return false;
        }
    },

    /**
     * Show notification message
     * @param {string} message - Notification text
     * @param {string} type - 'success' or 'error'
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `split-pane-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Style notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            background: type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: type === 'success' ? '#22c55e' : '#ef4444',
            padding: '12px 16px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: '1000',
            fontSize: '14px',
            fontFamily: "'input-mono', 'Courier New', monospace",
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            animation: 'slideIn 0.3s ease'
        });

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PromptSplitPane.init();
        console.log('✅ Tab opener initialized - Click "Send to Midjourney/Ideogram" to open service in new tab');
    });
} else {
    PromptSplitPane.init();
    console.log('✅ Tab opener initialized - Click "Send to Midjourney/Ideogram" to open service in new tab');
}

// Add CSS for notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PromptSplitPane = PromptSplitPane;
}
