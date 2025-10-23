// Web Browser functionality using webview tag
class WebBrowserController {
  constructor() {
    this.isOpen = false;
    this.controlsVisible = true;
    this.isFullscreen = false;
    this.webview = null;
    this.toggleButton = null;
    this.controlsToggleButton = null;
    this.controlsSection = null;
    this.notch = null;
    this.notchToggle = null;
    this.dropdownControls = null;
    this.moduleHeader = null;
    this.controlsCard = null;
    this.browserWindowCard = null;
    this.backButton = null;
    this.forwardButton = null;
    this.reloadButton = null;
    this.clearSessionButton = null;
    this.siteSelector = null;
    this.statusDiv = null;
  }

  init() {
    logger.debug("Initializing Web Browser UI controls");
    
    // Get DOM elements
    this.toggleButton = document.getElementById('browser-toggle');
    this.controlsToggleButton = document.getElementById('controls-toggle');
    this.controlsSection = document.getElementById('browser-controls-section');
    this.notch = document.getElementById('browser-notch');
    this.notchToggle = document.getElementById('notch-controls-toggle');
    this.dropdownControls = document.getElementById('browser-dropdown-controls');
    this.moduleHeader = document.getElementById('browser-module-header');
    this.controlsCard = document.getElementById('browser-controls-card');
    this.browserWindowCard = document.getElementById('browser-window-card');
    this.backButton = document.getElementById('browser-back');
    this.forwardButton = document.getElementById('browser-forward');
    this.reloadButton = document.getElementById('browser-reload');
    this.clearSessionButton = document.getElementById('browser-clear-session');
    this.siteSelector = document.getElementById('browser-site-selector');
    this.statusDiv = document.getElementById('browser-status');
    this.webview = document.getElementById('browser-webview');
    
    logger.debug('Webview element found:', !!this.webview);
    logger.debug('Toggle button found:', !!this.toggleButton);
    logger.debug('Controls toggle found:', !!this.controlsToggleButton);
    
    // Set up event listeners
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', () => {
        logger.debug('Toggle button clicked');
        this.toggleBrowser();
      });
    }
    
    if (this.controlsToggleButton) {
      this.controlsToggleButton.addEventListener('click', () => {
        logger.debug('Controls toggle clicked');
        this.toggleControls();
      });
    }
    
    if (this.notchToggle) {
      this.notchToggle.addEventListener('click', () => {
        logger.debug('Notch toggle clicked');
        this.toggleDropdownControls();
      });
    }
    
    // Dropdown controls event listeners
    const dropdownBack = document.getElementById('dropdown-browser-back');
    const dropdownForward = document.getElementById('dropdown-browser-forward');
    const dropdownReload = document.getElementById('dropdown-browser-reload');
    const dropdownClearSession = document.getElementById('dropdown-browser-clear-session');
    const dropdownSiteSelector = document.getElementById('dropdown-browser-site-selector');
    const dropdownClose = document.getElementById('dropdown-browser-close');
    
    if (dropdownBack) dropdownBack.addEventListener('click', () => this.goBack());
    if (dropdownForward) dropdownForward.addEventListener('click', () => this.goForward());
    if (dropdownReload) dropdownReload.addEventListener('click', () => this.reload());
    if (dropdownClearSession) dropdownClearSession.addEventListener('click', () => this.clearSession());
    if (dropdownSiteSelector) dropdownSiteSelector.addEventListener('change', () => this.navigateToSite(dropdownSiteSelector.value));
    if (dropdownClose) dropdownClose.addEventListener('click', () => this.closeBrowser());
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.dropdownControls && this.dropdownControls.style.display === 'block') {
        if (!this.dropdownControls.contains(e.target) && !this.notchToggle.contains(e.target)) {
          this.hideDropdownControls();
        }
      }
    });
    
    if (this.backButton) {
      this.backButton.addEventListener('click', () => this.goBack());
    }
    
    if (this.forwardButton) {
      this.forwardButton.addEventListener('click', () => this.goForward());
    }
    
    if (this.reloadButton) {
      this.reloadButton.addEventListener('click', () => this.reload());
    }
    
    if (this.clearSessionButton) {
      this.clearSessionButton.addEventListener('click', () => this.clearSession());
    }
    
    if (this.siteSelector) {
      this.siteSelector.addEventListener('change', () => this.navigateToSite());
    }
    
    // Set up webview event listeners
    this.setupWebviewListeners();
    
    // Listen for module changes to hide browser when not on Web Browser module
    this.setupModuleChangeListener();
  }

  setupWebviewListeners() {
    if (!this.webview) return;
    
    this.webview.addEventListener('dom-ready', () => {
      logger.debug('Webview DOM ready');
      this.updateStatus('Website loaded successfully');
      this.updateNavButtons();
      
      // Inject compatibility fixes for modern web apps like Ideogram
      this.webview.executeJavaScript(`
        (function() {
          logger.debug('🔧 Injecting browser compatibility fixes...');
          
          // Fix 1: Override navigator properties to appear more like regular Chrome
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
          });
          
          // Fix 2: Add missing touch event support
          if (!window.TouchEvent) {
            window.TouchEvent = class TouchEvent extends UIEvent {
              constructor(type, eventInitDict) {
                super(type, eventInitDict);
                this.touches = eventInitDict?.touches || [];
                this.targetTouches = eventInitDict?.targetTouches || [];
                this.changedTouches = eventInitDict?.changedTouches || [];
              }
            };
          }
          
          // Fix 3: Enhanced scroll behavior for better compatibility
          document.addEventListener('DOMContentLoaded', function() {
            // Force enable smooth scrolling
            document.documentElement.style.scrollBehavior = 'smooth';
            document.body.style.scrollBehavior = 'smooth';
            
            // Fix potential overflow issues
            document.body.style.overflowX = 'auto';
            document.body.style.overflowY = 'auto';
            
            // Add wheel event support for better scrolling
            document.addEventListener('wheel', function(e) {
              // Allow default wheel behavior
            }, { passive: true });
            
            logger.debug('✅ Browser compatibility fixes applied');
          });
          
          // Fix 4: Image loading and display enhancements
          document.addEventListener('DOMContentLoaded', function() {
            // Ensure images load properly
            const images = document.querySelectorAll('img');
            images.forEach(img => {
              if (!img.complete) {
                img.addEventListener('load', function() {
                  this.style.display = '';
                });
              }
            });
            
            // Monitor for dynamically added images
            const observer = new MutationObserver(function(mutations) {
              mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                  if (node.nodeType === 1) { // Element node
                    const imgs = node.tagName === 'IMG' ? [node] : node.querySelectorAll('img');
                    imgs.forEach(img => {
                      img.style.display = '';
                      img.style.visibility = 'visible';
                    });
                  }
                });
              });
            });
            observer.observe(document.body, { childList: true, subtree: true });
          });
          
          logger.debug('🌐 Webview enhanced for better web app compatibility');
        })();
      `).catch(err => logger.debug('Failed to inject compatibility fixes:', err));
    });
    
    this.webview.addEventListener('did-navigate', (event) => {
      logger.debug('Webview navigated to:', event.url);
      this.updateStatus(`Browsing: ${event.url}`);
      this.updateNavButtons();
    });
    
    this.webview.addEventListener('page-title-updated', (event) => {
      this.updateStatus(`${event.title}`);
    });
    
    this.webview.addEventListener('did-fail-load', (event) => {
      console.error('Webview failed to load:', event);
      this.updateStatus(`❌ Failed to load: ${event.errorDescription}`);
    });
    
    this.webview.addEventListener('new-window', (event) => {
      logger.debug('New window requested:', event.url);
      // For OAuth/login URLs, navigate in the same webview
      if (this.isOAuthOrLoginURL(event.url)) {
        event.preventDefault();
        this.webview.src = event.url;
      }
      // Other links will open in default browser (default behavior)
    });
  }

  isOAuthOrLoginURL(url) {
    const oauthPatterns = [
      'discord.com',
      'accounts.google.com', 
      'login.microsoftonline.com',
      'auth.',
      'oauth',
      'login',
      'signin',
      'sso.',
      'callback',
      'redirect_uri',
      'midjourney.com',
      'ideogram.ai'
    ];
    
    return oauthPatterns.some(pattern => url.toLowerCase().includes(pattern));
  }

  updateNavButtons() {
    if (!this.webview) return;
    
    if (this.backButton) {
      this.backButton.disabled = !this.webview.canGoBack();
    }
    if (this.forwardButton) {
      this.forwardButton.disabled = !this.webview.canGoForward();
    }
  }

  setupModuleChangeListener() {
    // Watch for menu item clicks to detect module changes
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        // Small delay to let the module switch complete
        setTimeout(() => {
          const webBrowserModule = document.getElementById('web-browser-module');
          const isWebBrowserModuleActive = webBrowserModule && webBrowserModule.classList.contains('active');
          
          // If browser is open but we're not on the web browser module, hide it
          if (this.isOpen && !isWebBrowserModuleActive) {
            logger.debug('Hiding browser panel - switched away from Web Browser module');
            this.closeBrowser();
          }
        }, 100);
      });
    });
  }

  toggleDropdownControls() {
    if (this.dropdownControls.style.display === 'block') {
      this.hideDropdownControls();
    } else {
      this.showDropdownControls();
    }
  }

  showDropdownControls() {
    this.dropdownControls.style.display = 'block';
    
    // Position dropdown relative to content area
    const mainContent = document.querySelector('.main-content');
    const contentRect = mainContent ? mainContent.getBoundingClientRect() : null;
    
    if (contentRect) {
      this.dropdownControls.style.top = (contentRect.top + 60) + 'px';
      this.dropdownControls.style.right = (window.innerWidth - contentRect.right + 10) + 'px';
    }
    
    // Sync dropdown controls with main controls
    const dropdownSiteSelector = document.getElementById('dropdown-browser-site-selector');
    if (dropdownSiteSelector && this.siteSelector) {
      dropdownSiteSelector.value = this.siteSelector.value;
    }
  }

  hideDropdownControls() {
    this.dropdownControls.style.display = 'none';
  }

  enterFullscreenMode() {
    logger.debug('Entering fullscreen browser mode');
    this.isFullscreen = true;
    
    // Hide header and controls card
    if (this.moduleHeader) this.moduleHeader.style.display = 'none';
    if (this.controlsCard) this.controlsCard.style.display = 'none';
    
    // Show notch positioned relative to the browser window card
    if (this.notch) {
      this.notch.style.display = 'block';
      this.notch.style.position = 'absolute';
      this.notch.style.top = '10px';
      this.notch.style.right = '10px';
      this.notch.style.zIndex = '502';
    }
    
    // Make browser window card take full available height within its container
    if (this.browserWindowCard) {
      // Get the actual available space dynamically
      const webBrowserModule = document.getElementById('web-browser-module');
      const moduleHeader = document.getElementById('browser-module-header');
      const controlsCard = document.getElementById('browser-controls-card');
      
      let availableHeight = window.innerHeight;
      if (moduleHeader) availableHeight -= moduleHeader.offsetHeight;
      if (controlsCard && controlsCard.style.display !== 'none') availableHeight -= controlsCard.offsetHeight;
      availableHeight -= 40; // Account for any remaining margins/padding
      
      this.browserWindowCard.style.position = 'relative';
      this.browserWindowCard.style.width = '100%';
      this.browserWindowCard.style.height = availableHeight + 'px';
      this.browserWindowCard.style.margin = '0';
      this.browserWindowCard.style.padding = '0'; // Remove the default 20px padding
      this.browserWindowCard.style.border = 'none';
      this.browserWindowCard.style.borderRadius = '0';
      this.browserWindowCard.style.background = 'transparent';
      this.browserWindowCard.style.overflow = 'hidden';
      this.browserWindowCard.style.boxSizing = 'border-box';
    }
    
    // Hide the "Browser Window" title
    const h3 = this.browserWindowCard.querySelector('h3');
    if (h3) h3.style.display = 'none';
    
    // Make webview take full space within its container
    if (this.webview) {
      this.webview.style.position = 'absolute';
      this.webview.style.top = '0';
      this.webview.style.left = '0';
      this.webview.style.width = '100%';
      this.webview.style.height = '100%';
      this.webview.style.border = 'none';
      this.webview.style.borderRadius = '0';
      this.webview.style.maxWidth = '100%';
      this.webview.style.overflow = 'hidden';
      this.webview.style.zIndex = '501';
      this.webview.style.display = 'flex';
      this.webview.style.visibility = 'visible';
      this.webview.style.margin = '0';
      this.webview.style.padding = '0';
      this.webview.style.boxSizing = 'border-box';
      
      // Force a repaint
      this.webview.style.transform = 'translateZ(0)';
      
      logger.debug('Webview positioned:', {
        position: this.webview.style.position,
        width: this.webview.style.width,
        height: this.webview.style.height,
        display: this.webview.style.display,
        src: this.webview.src
      });
    }
  }

  exitFullscreenMode() {
    logger.debug('Exiting fullscreen browser mode');
    this.isFullscreen = false;
    
    // Show header and controls card
    if (this.moduleHeader) this.moduleHeader.style.display = 'block';
    if (this.controlsCard) this.controlsCard.style.display = 'block';
    
    // Hide notch and dropdown
    if (this.notch) this.notch.style.display = 'none';
    this.hideDropdownControls();
    
    // Reset browser window card
    if (this.browserWindowCard) {
      this.browserWindowCard.style.position = 'relative';
      this.browserWindowCard.style.top = 'auto';
      this.browserWindowCard.style.left = 'auto';
      this.browserWindowCard.style.right = 'auto';
      this.browserWindowCard.style.bottom = 'auto';
      this.browserWindowCard.style.width = '';
      this.browserWindowCard.style.height = '';
      this.browserWindowCard.style.margin = '';
      this.browserWindowCard.style.padding = '20px'; // Restore default content-card padding
      this.browserWindowCard.style.border = '';
      this.browserWindowCard.style.borderRadius = '';
      this.browserWindowCard.style.background = '';
      this.browserWindowCard.style.overflow = '';
      this.browserWindowCard.style.boxSizing = '';
    }
    
    // Show the "Browser Window" title
    const h3 = this.browserWindowCard.querySelector('h3');
    if (h3) h3.style.display = 'block';
    
    // Reset webview
    if (this.webview) {
      this.webview.style.position = 'relative';
      this.webview.style.top = 'auto';
      this.webview.style.left = 'auto';
      this.webview.style.width = '100%';
      this.webview.style.height = 'calc(100vh - 200px)';
      this.webview.style.border = '1px solid #444';
      this.webview.style.borderRadius = '4px';
    }
  }

  toggleControls() {
    logger.debug('toggleControls called, controlsVisible:', this.controlsVisible);
    
    if (!this.controlsSection || !this.controlsToggleButton) {
      console.error('Controls section or toggle button not found');
      return;
    }
    
    if (this.controlsVisible) {
      // Hide controls
      this.controlsSection.style.display = 'none';
      this.controlsToggleButton.innerHTML = '<i class="fas fa-chevron-down"></i> Show Controls';
      this.controlsVisible = false;
    } else {
      // Show controls
      this.controlsSection.style.display = 'block';
      this.controlsToggleButton.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Controls';
      this.controlsVisible = true;
    }
  }

  toggleBrowser() {
    logger.debug('toggleBrowser called, isOpen:', this.isOpen);
    
    // Check if we're currently on the web browser module
    const webBrowserModule = document.getElementById('web-browser-module');
    const isWebBrowserModuleActive = webBrowserModule && webBrowserModule.classList.contains('active');
    
    if (!isWebBrowserModuleActive) {
      this.updateStatus('⚠️ Please navigate to the Web Browser module first');
      return;
    }
    
    if (this.isOpen) {
      this.closeBrowser();
    } else {
      this.openBrowser();
    }
  }

  openBrowser(url = null) {
    logger.debug('openBrowser called with URL:', url);
    if (!this.webview) {
      console.error('Webview not found');
      return;
    }
    
    // Use provided URL or fall back to site selector
    const targetUrl = url || (this.siteSelector ? this.siteSelector.value : 'https://www.midjourney.com');
    logger.debug('Loading site:', targetUrl);
    
    // Show webview
    this.webview.style.display = 'flex';
    this.webview.style.visibility = 'visible';
    
    // Load the site BEFORE entering fullscreen mode
    this.webview.src = targetUrl;
    logger.debug('Webview src set to:', this.webview.src);
    
    // Enter fullscreen mode after a brief delay to let webview initialize
    setTimeout(() => {
      this.enterFullscreenMode();
    }, 100);
    
    // Add CSS injection when the page loads to maximize content area
    this.webview.addEventListener('dom-ready', () => {
      logger.debug('Webview dom-ready event fired');
      const css = `
        html, body { 
          margin: 0 !important; 
          padding: 0 !important; 
          overflow: hidden !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          height: 100vh !important;
          max-height: 100vh !important;
        }
        .main-content, .content, .page-content { 
          margin: 0 !important; 
          padding-top: 0 !important;
          max-width: 100% !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
          max-height: 100vh !important;
        }
        .header-spacer, .top-spacer { display: none !important; }
        /* Target Midjourney specific elements */
        [class*="sidebar"], [class*="navigation"] { 
          max-height: 100vh !important; 
          overflow: hidden !important; 
        }
        [class*="main"], [class*="content"] { 
          max-height: 100vh !important; 
          overflow: hidden !important; 
        }
        * { 
          max-width: 100% !important; 
          box-sizing: border-box !important;
        }
        /* Hide any scrollbars on the page */
        ::-webkit-scrollbar { width: 0px !important; height: 0px !important; }
        body::-webkit-scrollbar { display: none !important; }
        html { scrollbar-width: none !important; }
        /* Prevent any elements from exceeding viewport */
        body > * { max-height: 100vh !important; overflow: hidden !important; }
      `;
      this.webview.insertCSS(css);
    });
    
    // Add loading event listeners for debugging
    this.webview.addEventListener('did-start-loading', () => {
      logger.debug('Webview started loading');
      this.updateStatus('Loading website...');
    });
    
    this.webview.addEventListener('did-finish-load', () => {
      logger.debug('Webview finished loading');
      this.updateStatus('Website loaded successfully');
    });
    
    this.webview.addEventListener('did-fail-load', (event) => {
      console.error('Webview failed to load:', event);
      this.updateStatus('Failed to load website');
    });
    
    this.isOpen = true;
    if (this.toggleButton) {
      this.toggleButton.innerHTML = '<i class="fas fa-times"></i> Close Browser';
    }
    this.updateStatus('Loading website...');
    this.enableNavButtons();
    
    logger.debug('Browser opened with URL:', targetUrl);
  }

  closeBrowser() {
    logger.debug('closeBrowser called');
    if (!this.webview) return;
    
    // Exit fullscreen mode
    this.exitFullscreenMode();
    
    // Hide webview
    this.webview.style.display = 'none';
    
    this.isOpen = false;
    if (this.toggleButton) {
      this.toggleButton.innerHTML = '<i class="fas fa-globe"></i> Open Browser';
    }
    this.updateStatus('Browser closed');
    this.disableNavButtons();
  }

  goBack() {
    if (this.webview && this.webview.canGoBack()) {
      this.webview.goBack();
    }
  }

  goForward() {
    if (this.webview && this.webview.canGoForward()) {
      this.webview.goForward();
    }
  }

  reload() {
    if (this.webview) {
      this.webview.reload();
    }
  }

  clearSession() {
    if (this.webview) {
      // Clear storage and reload
      this.webview.clearHistory();
      if (this.webview.getWebContents) {
        this.webview.getWebContents().session.clearStorageData();
      }
      this.updateStatus('🗑️ Session cleared. You may need to log in again.');
      
      // Show temporary feedback
      if (this.clearSessionButton) {
        const originalText = this.clearSessionButton.innerHTML;
        this.clearSessionButton.innerHTML = '<i class="fas fa-check"></i> Cleared!';
        this.clearSessionButton.disabled = true;
        
        setTimeout(() => {
          this.clearSessionButton.innerHTML = originalText;
          this.clearSessionButton.disabled = false;
        }, 2000);
      }
    }
  }

  navigateToSite(url = null) {
    if (this.isOpen && this.webview) {
      const targetUrl = url || (this.siteSelector ? this.siteSelector.value : 'https://www.midjourney.com');
      this.webview.src = targetUrl;
      this.updateStatus(`Navigating to ${targetUrl}...`);
      
      // Sync both selectors
      if (this.siteSelector) this.siteSelector.value = targetUrl;
      const dropdownSelector = document.getElementById('dropdown-browser-site-selector');
      if (dropdownSelector) dropdownSelector.value = targetUrl;
    }
  }

  updateStatus(message) {
    if (this.statusDiv) {
      this.statusDiv.textContent = message;
    }
    logger.debug('Status:', message);
  }

  enableNavButtons() {
    if (this.backButton) this.backButton.disabled = false;
    if (this.forwardButton) this.forwardButton.disabled = false;
    if (this.reloadButton) this.reloadButton.disabled = false;
  }

  disableNavButtons() {
    if (this.backButton) this.backButton.disabled = true;
    if (this.forwardButton) this.forwardButton.disabled = true;
    if (this.reloadButton) this.reloadButton.disabled = true;
  }

  importIdeogramCookies(cookieJson) {
    logger.debug('🍪 Starting Ideogram cookie import...');
    
    if (!cookieJson) {
      logger.debug(`
🍪 Usage: window.webBrowserController.importIdeogramCookies(cookieJson)

Example:
window.webBrowserController.importIdeogramCookies([
  {"name":"AMP_MKTG_da0464495c","value":"JTdCJTdE","domain":".ideogram.ai","path":"/","secure":true,"httpOnly":false,"expirationDate":1757725120},
  {"name":"AMP_da0464495c","value":"JTdCJTIy...","domain":".ideogram.ai","path":"/","secure":true,"httpOnly":false,"expirationDate":1757725120}
])

Paste your cookie array as the parameter.
      `);
      return;
    }
    
    try {
      const cookies = Array.isArray(cookieJson) ? cookieJson : JSON.parse(cookieJson);
      logger.debug(`🍪 Importing ${cookies.length} cookies...`);
      this.applyCookiesToWebview(cookies);
    } catch (err) {
      logger.debug('❌ Invalid cookie format:', err);
      logger.debug('Expected format: Array of cookie objects or JSON string');
    }
  }

  applyCookiesToWebview(cookies) {
    logger.debug('🔄 Applying cookies to webview...');
    
    // Use IPC to send cookies to main process for application
    if (window.ipcRenderer) {
      logger.debug('📤 Sending cookies to main process for application...');
      window.ipcRenderer.send('apply-ideogram-cookies', cookies);
      
      // Listen for success response
      window.ipcRenderer.once('ideogram-cookies-applied', (event, success) => {
        if (success) {
          logger.debug('✅ Cookies applied successfully!');
          logger.debug('🎯 Cookies are now active. You can manually navigate to test authentication.');
          logger.debug('💡 Try: window.webBrowserController.webview.src = "https://ideogram.ai/t/create"');
          this.updateStatus('🎉 Authentication cookies applied! Navigate manually to test.');
        } else {
          logger.debug('❌ Failed to apply cookies via main process');
        }
      });
    } else {
      logger.debug('❌ IPC not available for cookie application');
    }
  }
}

// Create and initialize the web browser controller
const webBrowserController = new WebBrowserController();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => webBrowserController.init());
} else {
  webBrowserController.init();
}

// Make it globally available for debugging
window.webBrowserController = webBrowserController;
