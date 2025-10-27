/**
 * Browser Send Shim
 * Provides compatibility layer for send functions that work with both
 * batch sends and individual prompt sends
 */

/**
 * Send a single prompt to Midjourney or Ideogram
 * @param {string} prompt - The prompt text to send
 * @param {string} platform - 'midjourney' or 'ideogram'
 */
async function sendPromptWithGlobalSetting(prompt, platform) {
    logger.debug(`🚀 [SHIM] sendPromptWithGlobalSetting called - Platform: ${platform}`);
    logger.debug(`📝 [SHIM] Prompt: ${prompt.substring(0, 100)}...`);
    
    const cleanPrompt = prompt.replace(/^\/imagine\s+prompt:\s*/i, '').trim();
    logger.debug(`🧹 [SHIM] Clean prompt: ${cleanPrompt.substring(0, 100)}...`);
    
    try {
        if (platform === 'midjourney') {
            logger.debug('📡 [SHIM] Calling /api/midjourney/submit...');
            
            const response = await fetch('/api/midjourney/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ prompt: cleanPrompt })
            });

            const data = await response.json();

            if (data.success) {
                window.Utils.showToast('✅ Sent to Midjourney!', 'success');
                logger.debug('Midjourney send successful');
                return { success: true };
            } else {
                throw new Error(data.error || 'Failed to send to Midjourney');
            }
        } else if (platform === 'ideogram') {
            const response = await fetch('/api/ideogram/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ prompt: cleanPrompt })
            });

            const data = await response.json();

            if (data.success) {
                window.Utils.showToast('✅ Sent to Ideogram!', 'success');
                logger.debug('Ideogram send successful');
                return { success: true };
            } else {
                throw new Error(data.error || 'Failed to send to Ideogram');
            }
        } else {
            throw new Error(`Unknown platform: ${platform}`);
        }
    } catch (error) {
        logger.error(`❌ Send to ${platform} failed:`, error);
        window.Utils.showToast(`❌ Error: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Get current browser mode (always returns 'external' for web app)
 */
function getCurrentBrowserMode() {
    return 'external';
}

/**
 * Get browser mode (always returns 'external' for web app)
 */
function getBrowserMode() {
    return 'external';
}

/**
 * Add recent prompt (stub for web app - prompts stored server-side)
 */
function addRecentPrompt(promptText) {
    // In web app, prompts are stored in database, not local storage
    logger.debug('addRecentPrompt called (web app - using database storage)');
    return true;
}

// Export to window object
window.sendPromptWithGlobalSetting = sendPromptWithGlobalSetting;
window.getCurrentBrowserMode = getCurrentBrowserMode;
window.getBrowserMode = getBrowserMode;
window.addRecentPrompt = addRecentPrompt;

logger.debug('✅ Browser send shim loaded');
