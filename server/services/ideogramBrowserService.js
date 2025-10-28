const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class IdeogramBrowserService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.userDataDir = path.join(__dirname, '../../browser-profiles/ideogram');
    this.isInitialized = false;
  }

  /**
   * Clean up lock files that might prevent browser from starting
   */
  async cleanupLockFiles() {
    try {
      const lockFile = path.join(this.userDataDir, 'SingletonLock');
      await fs.unlink(lockFile).catch(() => {});
      console.log('🧹 Cleaned up lock files');
    } catch (error) {
      // Ignore errors - lock file might not exist
    }
  }

  /**
   * Initialize browser instance with persistent profile
   */
  async initialize(headless = true) {
    if (this.browser && this.browser.isConnected()) {
      console.log('✅ Browser already running and connected');
      return;
    }

    console.log('🚀 Initializing Ideogram browser automation...');
    
    // Clean up any stale lock files
    await this.cleanupLockFiles();
    
    // Ensure profile directory exists
    await fs.mkdir(this.userDataDir, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: headless ? 'new' : false,
      userDataDir: this.userDataDir, // Persistent browser profile - saves cookies, localStorage, etc.
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-position=100,100',
        '--disable-popup-blocking',
        '--disable-background-mode',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--enable-features=NetworkService,NetworkServiceInProcess'
      ],
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection'],
      defaultViewport: null
    });

    this.page = await this.browser.newPage();
    
    // Enhanced stealth: Remove webdriver flags and set realistic properties
    await this.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Chrome runtime
      window.chrome = {
        runtime: {}
      };
      
      // Permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });
    
    // Set realistic viewport and user agent
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    
    // Set extra headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-User': '?1',
      'Sec-Fetch-Dest': 'document'
    });

    this.isInitialized = true;
    console.log('✅ Ideogram browser initialized with persistent profile');
  }

  /**
   * Check if user is logged in to Ideogram
   */
  async isLoggedIn() {
    try {
      // Reuse existing page instead of creating new one
      const currentUrl = this.page.url();
      if (!currentUrl.includes('ideogram.ai')) {
        await this.page.goto('https://ideogram.ai', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for login button/link using modern selector approach
      const loginButton = await this.page.evaluate(() => {
        // Check for buttons with login text
        const buttons = Array.from(document.querySelectorAll('button'));
        const hasLoginButton = buttons.some(btn => 
          btn.textContent.toLowerCase().includes('log in') || 
          btn.textContent.toLowerCase().includes('sign in')
        );
        
        // Check for login links
        const hasLoginLink = !!document.querySelector('a[href*="login"]');
        
        return hasLoginButton || hasLoginLink;
      });
      
      if (!loginButton) {
        console.log('✅ Already logged in to Ideogram');
        return true;
      }

      console.log('❌ Not logged in to Ideogram');
      return false;
    } catch (error) {
      console.error('⚠️ Error checking Ideogram login status:', error.message);
      return false;
    }
  }

  /**
   * Open browser for manual login (setup)
   */
  async setupAuthentication() {
    try {
      console.log('🔐 Opening Ideogram for manual authentication...');
      
      // Force close any existing browser instance
      if (this.browser) {
        console.log('🔄 Closing existing browser instance...');
        await this.close();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cleanup
      }
      
      // Clean up lock files before launching
      await this.cleanupLockFiles();
      
      // Initialize with visible browser
      await this.initialize(false);
      
      await this.page.goto('https://ideogram.ai/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      console.log('✅ Navigated to Ideogram login page');
      console.log('⏳ Browser opened for manual login...');
      console.log('Please log in to Ideogram. Browser will stay open.');
      console.log('Session will be saved automatically for future use.');

      // Try to bring window to front on macOS
      try {
        await this.page.bringToFront();
        console.log('✅ Attempted to bring browser to front');
      } catch (e) {
        console.log('⚠️ Could not bring browser to front:', e.message);
      }

      return {
        success: true,
        message: 'Browser opened for manual authentication. Please log in to Ideogram.',
        sessionSaved: true
      };
    } catch (error) {
      console.error('❌ Failed to open browser for authentication:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Submit a prompt to Ideogram
   */
  async submitPrompt(prompt, options = {}) {
    try {
      // Check if browser is running and connected
      const browserConnected = this.browser && this.browser.isConnected && this.browser.isConnected();
      
      if (!browserConnected || !this.isInitialized) {
        console.log('🔄 Browser not running, initializing...');
        // Clean up any stale references
        this.browser = null;
        this.page = null;
        this.isInitialized = false;
        
        await this.initialize(false); // Use visible browser for submission
      }

      console.log('📝 Submitting prompt to Ideogram:', prompt.substring(0, 50) + '...');

      // Get current URL to check if we're already on the right page
      const currentUrl = this.page.url();
      const isOnIdeogram = currentUrl.includes('ideogram.ai');
      
      // Only navigate if we're not already on Ideogram
      if (!isOnIdeogram) {
        console.log('🔄 Navigating to Ideogram...');
        await this.page.goto('https://ideogram.ai/t/explore', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
      } else {
        console.log('✅ Already on Ideogram page');
        // Bring the page to front
        await this.page.bringToFront();
      }

      // Wait for prompt input (look for common selectors)
      await this.page.waitForSelector('textarea[placeholder*="Describe"], textarea[placeholder*="prompt"], .prompt-input textarea, textarea', {
        timeout: 10000
      });

      // Find and click the textarea
      const textarea = await this.page.$('textarea[placeholder*="Describe"], textarea[placeholder*="prompt"], .prompt-input textarea, textarea');
      if (!textarea) {
        throw new Error('Could not find prompt input field');
      }

      await textarea.click();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Strip /imagine prompt: prefix if present (not needed for Ideogram)
      const cleanPrompt = prompt.replace(/^\/imagine\s+prompt:\s*/i, '').trim();
      console.log('📋 Using clean prompt:', cleanPrompt.substring(0, 50) + '...');

      // Clear existing text
      await this.page.keyboard.down('Meta'); // Command key on Mac
      await this.page.keyboard.press('A');
      await this.page.keyboard.up('Meta');
      await this.page.keyboard.press('Backspace');
      
      await new Promise(resolve => setTimeout(resolve, 300));

      // FAST: Set value directly using page.evaluate
      await this.page.evaluate((text) => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.value = text;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, cleanPrompt);

      console.log('✅ Prompt pasted into field');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try multiple methods to submit
      let submitted = false;

      // Method 1: Click Generate button
      try {
        const generateButton = await this.page.evaluate(() => {
          // Look for Generate button by text content
          const buttons = Array.from(document.querySelectorAll('button'));
          const generateBtn = buttons.find(btn => 
            btn.textContent.toLowerCase().includes('generate') ||
            btn.textContent.toLowerCase().includes('create')
          );
          
          if (generateBtn) {
            generateBtn.click();
            return true;
          }
          return false;
        });

        if (generateButton) {
          console.log('✅ Clicked Generate button');
          submitted = true;
        }
      } catch (error) {
        console.log('⚠️ Could not click Generate button:', error.message);
      }

      // Method 2: Try Ctrl+Enter if Generate button didn't work
      if (!submitted) {
        try {
          await this.page.keyboard.down('Meta');
          await this.page.keyboard.press('Enter');
          await this.page.keyboard.up('Meta');
          console.log('✅ Pressed Cmd+Enter to submit');
          submitted = true;
        } catch (error) {
          console.log('⚠️ Cmd+Enter failed:', error.message);
        }
      }

      // Method 3: Fallback to plain Enter
      if (!submitted) {
        await this.page.keyboard.press('Enter');
        console.log('✅ Pressed Enter to submit');
      }

      console.log('✅ Prompt submitted to Ideogram');

      // Wait to see if submission was successful
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        message: 'Prompt submitted successfully',
        prompt: prompt
      };

    } catch (error) {
      console.error('❌ Failed to submit prompt to Ideogram:', error.message);
      throw error;
    }
  }

  /**
   * Submit multiple prompts with delays
   */
  async submitBatch(prompts, delayMs = 3000, autoClose = true) {
    const results = [];

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      console.log(`📤 Submitting prompt ${i + 1}/${prompts.length}`);

      try {
        const result = await this.submitPrompt(prompt);
        results.push(result);

        // Wait before next prompt (except for last one)
        if (i < prompts.length - 1) {
          console.log(`⏳ Waiting ${delayMs}ms before next prompt...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          prompt: prompt
        });
      }
    }

    // Auto-close the browser window after all prompts are submitted
    if (autoClose && this.browser) {
      console.log('🔄 Auto-closing browser window after batch completion...');
      // Small delay before closing to ensure last prompt is submitted
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.close();
      console.log('✅ Browser window closed');
    }

    return results;
  }

  /**
   * Close browser instance
   */
  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.log('⚠️ Error closing browser:', error.message);
      }
      this.browser = null;
      this.page = null;
      this.isInitialized = false;
      
      // Clean up lock files after closing
      await this.cleanupLockFiles();
      
      console.log('✅ Ideogram browser closed');
    }
  }

  /**
   * Keep browser alive but navigate away
   */
  async minimize() {
    if (this.page) {
      await this.page.goto('about:blank');
    }
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new IdeogramBrowserService();
    }
    return instance;
  },
  IdeogramBrowserService
};
