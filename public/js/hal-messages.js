/**
 * HAL 9000-Style Streaming Messages for Auth Screen
 * Displays rotating messages with typing animation effect
 */

class HALMessenger {
    constructor(elementId, messages, options = {}) {
        this.element = document.getElementById(elementId);
        this.messages = messages;
        this.currentMessageIndex = 0;
        this.currentCharIndex = 0;
        this.isTyping = false;
        this.isPaused = false;
        
        // Options
        this.typingSpeed = options.typingSpeed || 50; // ms per character
        this.pauseBetweenMessages = options.pauseBetweenMessages || 3000; // ms
        this.deleteSpeed = options.deleteSpeed || 30; // ms per character when deleting
        this.pauseBeforeDelete = options.pauseBeforeDelete || 2000; // ms
        
        // Bind methods
        this.type = this.type.bind(this);
        this.delete = this.delete.bind(this);
        this.nextMessage = this.nextMessage.bind(this);
    }
    
    start() {
        if (!this.element || this.messages.length === 0) return;
        this.type();
    }
    
    stop() {
        this.isPaused = true;
    }
    
    resume() {
        this.isPaused = false;
        this.type();
    }
    
    type() {
        if (this.isPaused) return;
        
        const currentMessage = this.messages[this.currentMessageIndex];
        
        if (this.currentCharIndex < currentMessage.length) {
            this.element.textContent = currentMessage.substring(0, this.currentCharIndex + 1);
            this.currentCharIndex++;
            setTimeout(this.type, this.typingSpeed);
        } else {
            // Message fully typed, wait then delete
            setTimeout(this.delete, this.pauseBeforeDelete);
        }
    }
    
    delete() {
        if (this.isPaused) return;
        
        const currentMessage = this.messages[this.currentMessageIndex];
        
        if (this.currentCharIndex > 0) {
            this.currentCharIndex--;
            this.element.textContent = currentMessage.substring(0, this.currentCharIndex);
            setTimeout(this.delete, this.deleteSpeed);
        } else {
            // Message fully deleted, move to next
            setTimeout(this.nextMessage, this.pauseBetweenMessages);
        }
    }
    
    nextMessage() {
        if (this.isPaused) return;
        
        this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messages.length;
        this.currentCharIndex = 0;
        this.type();
    }
    
    showError(message) {
        this.stop();
        this.element.textContent = message;
        this.element.style.color = 'var(--danger)';
    }
    
    clearError() {
        this.element.style.color = '';
        this.currentCharIndex = 0;
        this.resume();
    }
}

// HAL 9000 messages for login screen
const loginMessages = [
    '... please enter your login credentials above.',
    '... your email and password are required to proceed.',
    '... I\'m sorry, but I need your authentication first.',
    '... access denied without proper credentials.',
    '... I\'m afraid I can\'t let you do that... without logging in.',
    '... just what do you think you\'re doing, Dave?',
    '... authentication required for system access.',
    '... please identify yourself to continue.'
];

const registerMessages = [
    '... please create your account credentials above.',
    '... your name, email, and password are required.',
    '... welcome aboard. Please register to continue.',
    '... new user registration in progress...',
    '... establishing secure account parameters...',
    '... please provide your information to proceed.'
];

// Initialize HAL messengers when DOM is ready
let loginHAL, registerHAL;

document.addEventListener('DOMContentLoaded', () => {
    loginHAL = new HALMessenger('login-error', loginMessages, {
        typingSpeed: 40,
        deleteSpeed: 20,
        pauseBeforeDelete: 3000,
        pauseBetweenMessages: 500
    });
    
    registerHAL = new HALMessenger('register-error', registerMessages, {
        typingSpeed: 40,
        deleteSpeed: 20,
        pauseBeforeDelete: 3000,
        pauseBetweenMessages: 500
    });
    
    // Export to window for access from other scripts
    window.loginHAL = loginHAL;
    window.registerHAL = registerHAL;
    
    // Start login messages by default
    loginHAL.start();
    
    // Handle tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if (tab === 'login') {
                registerHAL.stop();
                loginHAL.clearError();
            } else if (tab === 'register') {
                loginHAL.stop();
                registerHAL.clearError();
            }
        });
    });
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HALMessenger, loginHAL, registerHAL };
}
