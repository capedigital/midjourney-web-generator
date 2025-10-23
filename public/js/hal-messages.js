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
        this.pauseBeforeDelete = options.pauseBeforeDelete || 2000; // ms
        
        // Bind methods
        this.type = this.type.bind(this);
        this.fadeOut = this.fadeOut.bind(this);
        this.nextMessage = this.nextMessage.bind(this);
    }
    
    start() {
        if (!this.element) {
            console.error('HAL: Element not found');
            return;
        }
        if (this.messages.length === 0) {
            console.error('HAL: No messages');
            return;
        }
        
        // Ensure element is visible and has proper styling
        this.element.style.opacity = '1';
        this.element.style.display = 'flex';
        
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
            const text = currentMessage.substring(0, this.currentCharIndex + 1);
            this.element.textContent = text;
            
            // Scroll to keep the cursor visible
            this.element.scrollLeft = this.element.scrollWidth;
            
            this.currentCharIndex++;
            setTimeout(this.type, this.typingSpeed);
        } else {
            // Message fully typed, wait then fade out
            setTimeout(() => this.fadeOut(), this.pauseBeforeDelete);
        }
    }
    
    fadeOut() {
        if (this.isPaused) return;
        
        // Fade out the text
        this.element.style.transition = 'opacity 0.5s ease-out';
        this.element.style.opacity = '0';
        
        // After fade completes, clear and show next message
        setTimeout(() => {
            this.element.textContent = '';
            this.element.style.opacity = '1';
            this.nextMessage();
        }, 500);
    }
    
    nextMessage() {
        if (this.isPaused) return;
        
        this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messages.length;
        this.currentCharIndex = 0;
        this.type();
    }
    
    showSuccess(message, onComplete) {
        this.stop();
        this.element.classList.add('hal-success');
        this.element.textContent = '';
        this.currentCharIndex = 0;
        
        // Type out success message
        const typeSuccess = () => {
            if (this.currentCharIndex < message.length) {
                this.element.textContent = message.substring(0, this.currentCharIndex + 1);
                this.currentCharIndex++;
                setTimeout(typeSuccess, this.typingSpeed);
            } else if (onComplete) {
                // Wait a moment then execute callback
                setTimeout(onComplete, 800);
            }
        };
        
        typeSuccess();
    }
    
    showError(message) {
        this.stop();
        this.element.classList.add('hal-error');
        this.element.textContent = message;
    }
    
    clearError() {
        this.element.classList.remove('hal-error', 'hal-success');
        this.element.textContent = '';
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
