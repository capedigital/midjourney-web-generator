/**
 * Top Navigation Controller
 * Manages the top navigation bar with hamburger menu
 */

const SplitPaneView = {
    /**
     * Initialize top navigation
     */
    init() {
        this.createTopNav();
        this.createSlideMenu();
        this.setupEventListeners();
    },

    /**
     * Create top navigation bar
     */
    createTopNav() {
        const topNav = document.createElement('div');
        topNav.className = 'top-nav';
        topNav.innerHTML = `
            <div class="top-nav-left">
                <button class="hamburger-menu" id="hamburger-btn">
                    <i class="fas fa-bars"></i>
                </button>
                <div class="app-logo">
                    <i class="fas fa-magic"></i>
                    <span>PromptLab</span>
                </div>
            </div>
            <div class="top-nav-right">
                <div class="top-nav-user" id="top-nav-user-profile" style="cursor: pointer;" title="View Profile & Settings">
                    <i class="fas fa-user-circle"></i>
                    <div style="display: flex; flex-direction: column; align-items: flex-start;">
                        <span id="top-nav-username" style="font-weight: 500;">User</span>
                        <span id="top-nav-email" style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">email@example.com</span>
                    </div>
                </div>
                <button class="top-nav-logout" id="top-nav-logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;
        
        const mainScreen = document.getElementById('main-screen');
        mainScreen.insertBefore(topNav, mainScreen.firstChild);
    },

    /**
     * Create slide-out menu
     */
    createSlideMenu() {
        const overlay = document.createElement('div');
        overlay.className = 'slide-menu-overlay';
        overlay.id = 'slide-menu-overlay';

        const slideMenu = document.createElement('div');
        slideMenu.className = 'slide-menu';
        slideMenu.id = 'slide-menu';
        
        // Copy menu items from sidebar
        const sidebarMenu = document.querySelector('.sidebar .menu');
        if (sidebarMenu) {
            slideMenu.innerHTML = sidebarMenu.outerHTML;
        }

        const mainScreen = document.getElementById('main-screen');
        mainScreen.appendChild(overlay);
        mainScreen.appendChild(slideMenu);
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Hamburger menu
        document.getElementById('hamburger-btn').addEventListener('click', () => {
            this.toggleSlideMenu();
        });

        // Slide menu overlay
        document.getElementById('slide-menu-overlay').addEventListener('click', () => {
            this.closeSlideMenu();
        });

        // Slide menu items
        document.querySelectorAll('#slide-menu .menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const module = e.currentTarget.dataset.module;
                if (module) {
                    window.app.switchModule(module);
                    this.closeSlideMenu();
                    this.updateActiveMenuItem(module);
                }
            });
        });

        // Top nav user profile click
        document.getElementById('top-nav-user-profile').addEventListener('click', () => {
            window.app.switchModule('settings-module');
            this.updateActiveMenuItem('settings-module');
        });

        // Top nav logout
        document.getElementById('top-nav-logout-btn').addEventListener('click', () => {
            window.app.handleLogout();
        });
    },

    /**
     * Toggle slide menu
     */
    toggleSlideMenu() {
        const menu = document.getElementById('slide-menu');
        const overlay = document.getElementById('slide-menu-overlay');
        
        menu.classList.toggle('open');
        overlay.classList.toggle('active');
    },

    /**
     * Close slide menu
     */
    closeSlideMenu() {
        document.getElementById('slide-menu').classList.remove('open');
        document.getElementById('slide-menu-overlay').classList.remove('active');
    },

    /**
     * Update active menu item
     */
    updateActiveMenuItem(moduleId) {
        // Update both sidebar and slide menu
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.module === moduleId) {
                item.classList.add('active');
            }
        });
    },

    /**
     * Update username in top nav
     */
    updateUsername(username) {
        const usernameEl = document.getElementById('top-nav-username');
        if (usernameEl) {
            usernameEl.textContent = username || 'User';
        }
    },

    /**
     * Update user email in top nav
     */
    updateUserEmail(email) {
        const emailEl = document.getElementById('top-nav-email');
        if (emailEl) {
            emailEl.textContent = email || 'email@example.com';
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for main screen to be visible
        const observer = new MutationObserver((mutations) => {
            const mainScreen = document.getElementById('main-screen');
            if (mainScreen && !mainScreen.classList.contains('hidden')) {
                SplitPaneView.init();
                observer.disconnect();
            }
        });
        
        observer.observe(document.body, { 
            attributes: true, 
            subtree: true,
            attributeFilter: ['class']
        });
    });
} else {
    const mainScreen = document.getElementById('main-screen');
    if (mainScreen && !mainScreen.classList.contains('hidden')) {
        SplitPaneView.init();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SplitPaneView = SplitPaneView;
}
