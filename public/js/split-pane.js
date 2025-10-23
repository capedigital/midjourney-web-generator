/**
 * Split Pane View Controller
 * Manages the split-screen layout with Midjourney iframe
 */

const SplitPaneView = {
    isActive: false,
    isDragging: false,
    leftPaneWidth: 50, // percentage
    
    /**
     * Initialize split pane view
     */
    init() {
        this.createTopNav();
        this.createSlideMenu();
        this.createSplitPane();
        this.setupEventListeners();
        this.loadSplitViewPreference();
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
                <button class="toggle-split-view" id="toggle-split-view-btn">
                    <i class="fas fa-columns"></i> Split View
                </button>
                <div class="top-nav-user">
                    <i class="fas fa-user-circle"></i>
                    <span id="top-nav-username">User</span>
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
     * Create split pane container
     */
    createSplitPane() {
        const splitContainer = document.createElement('div');
        splitContainer.className = 'split-pane-container';
        splitContainer.id = 'split-pane-container';
        splitContainer.style.display = 'none';
        
        splitContainer.innerHTML = `
            <div class="split-pane-left" id="split-pane-left">
                <!-- Module content will be moved here -->
            </div>
            <div class="split-pane-divider" id="split-pane-divider"></div>
            <div class="split-pane-right" id="split-pane-right">
                <div class="iframe-header">
                    <div class="iframe-header-title">
                        <i class="fas fa-globe"></i>
                        <span>Midjourney Create</span>
                    </div>
                    <div class="iframe-controls">
                        <button class="iframe-control-btn" id="iframe-refresh-btn" title="Refresh">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                        <button class="iframe-control-btn" id="iframe-maximize-btn" title="Maximize">
                            <i class="fas fa-expand"></i> Maximize
                        </button>
                    </div>
                </div>
                <div class="iframe-container">
                    <div class="iframe-loading" id="iframe-loading">
                        <i class="fas fa-spinner"></i>
                        <span>Loading Midjourney...</span>
                    </div>
                    <iframe 
                        id="midjourney-iframe" 
                        src="https://www.midjourney.com/create"
                        style="display: none;"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        allow="clipboard-write">
                    </iframe>
                </div>
            </div>
        `;

        const mainScreen = document.getElementById('main-screen');
        mainScreen.appendChild(splitContainer);

        // Setup iframe load event
        const iframe = document.getElementById('midjourney-iframe');
        iframe.addEventListener('load', () => {
            document.getElementById('iframe-loading').style.display = 'none';
            iframe.style.display = 'block';
        });
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

        // Toggle split view
        document.getElementById('toggle-split-view-btn').addEventListener('click', () => {
            this.toggleSplitView();
        });

        // Top nav logout
        document.getElementById('top-nav-logout-btn').addEventListener('click', () => {
            window.app.handleLogout();
        });

        // Iframe controls
        document.getElementById('iframe-refresh-btn').addEventListener('click', () => {
            this.refreshIframe();
        });

        document.getElementById('iframe-maximize-btn').addEventListener('click', () => {
            this.toggleIframeMaximize();
        });

        // Divider drag
        const divider = document.getElementById('split-pane-divider');
        divider.addEventListener('mousedown', (e) => {
            this.startDragging(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.drag(e);
            }
        });

        document.addEventListener('mouseup', () => {
            this.stopDragging();
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
     * Toggle split view on/off
     */
    toggleSplitView() {
        this.isActive = !this.isActive;
        const btn = document.getElementById('toggle-split-view-btn');
        const splitContainer = document.getElementById('split-pane-container');
        const appContainer = document.querySelector('.app-container');

        if (this.isActive) {
            // Enable split view
            document.body.classList.add('split-view-active');
            splitContainer.style.display = 'flex';
            
            // Move module content to left pane
            const modulePanel = document.querySelector('.module-panel');
            const leftPane = document.getElementById('split-pane-left');
            if (modulePanel && leftPane) {
                leftPane.innerHTML = '';
                leftPane.appendChild(modulePanel.cloneNode(true));
            }

            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-times"></i> Exit Split View';
            
            logger.debug('Split view enabled');
        } else {
            // Disable split view
            document.body.classList.remove('split-view-active');
            splitContainer.style.display = 'none';
            
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-columns"></i> Split View';
            
            logger.debug('Split view disabled');
        }

        // Save preference
        localStorage.setItem('splitViewActive', this.isActive);
    },

    /**
     * Refresh iframe
     */
    refreshIframe() {
        const iframe = document.getElementById('midjourney-iframe');
        const loading = document.getElementById('iframe-loading');
        
        iframe.style.display = 'none';
        loading.style.display = 'flex';
        
        iframe.src = iframe.src;
        
        logger.debug('Refreshing Midjourney iframe');
    },

    /**
     * Toggle iframe maximize
     */
    toggleIframeMaximize() {
        const leftPane = document.getElementById('split-pane-left');
        const divider = document.getElementById('split-pane-divider');
        const btn = document.getElementById('iframe-maximize-btn');

        if (leftPane.style.display === 'none') {
            // Restore split view
            leftPane.style.display = 'block';
            divider.style.display = 'block';
            btn.innerHTML = '<i class="fas fa-expand"></i> Maximize';
        } else {
            // Maximize iframe
            leftPane.style.display = 'none';
            divider.style.display = 'none';
            btn.innerHTML = '<i class="fas fa-compress"></i> Restore';
        }
    },

    /**
     * Start dragging divider
     */
    startDragging(e) {
        this.isDragging = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    },

    /**
     * Drag divider
     */
    drag(e) {
        if (!this.isDragging) return;

        const container = document.getElementById('split-pane-container');
        const containerRect = container.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const percentage = (mouseX / containerRect.width) * 100;

        // Limit between 20% and 80%
        if (percentage >= 20 && percentage <= 80) {
            this.leftPaneWidth = percentage;
            const leftPane = document.getElementById('split-pane-left');
            leftPane.style.flex = `0 0 ${percentage}%`;
            
            // Save preference
            localStorage.setItem('splitPaneWidth', percentage);
        }
    },

    /**
     * Stop dragging divider
     */
    stopDragging() {
        this.isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    },

    /**
     * Load split view preference
     */
    loadSplitViewPreference() {
        const savedActive = localStorage.getItem('splitViewActive');
        const savedWidth = localStorage.getItem('splitPaneWidth');

        if (savedWidth) {
            this.leftPaneWidth = parseFloat(savedWidth);
            const leftPane = document.getElementById('split-pane-left');
            if (leftPane) {
                leftPane.style.flex = `0 0 ${this.leftPaneWidth}%`;
            }
        }

        // Don't auto-enable split view on load, let user toggle it
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
     * Sync module content when switching modules in split view
     */
    syncModuleContent() {
        if (!this.isActive) return;

        const modulePanel = document.querySelector('.app-container .module-panel');
        const leftPane = document.getElementById('split-pane-left');
        
        if (modulePanel && leftPane) {
            leftPane.innerHTML = '';
            leftPane.appendChild(modulePanel.cloneNode(true));
            
            // Re-setup event listeners for the cloned content
            if (window.Generator && window.Generator.setupPromptActionHandlers) {
                window.Generator.setupPromptActionHandlers();
            }
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
