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
   * Initialize browser instance with persistent profile
   */
  async initialize(headless = true) {
    if (this.browser) {
      return;
    }

    console.log('🚀 Initializing Ideogram browser automation...');
    
    // Ensure profile directory exists
    await fs.mkdir(this.userDataDir, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: headless ? 'new' : false,
      userDataDir: this.userDataDir, // Persistent browser profile - saves cookies, localStorage, etc.
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-position=3000,3000', // Position off-screen to appear in background
        '--disable-popup-blocking'
      ],
      // Don't activate or focus the window when launching
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: null
    });

    this.page = await this.browser.newPage();
    
    // Set realistic viewport and user agent
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    this.isInitialized = true;
    console.log('✅ Ideogram browser initialized with persistent profile');
  }

  /**
   * Check if user is logged in to Ideogram
   */
  async isLoggedIn() {
    try {
      // Create a new page for status check to avoid detached frame issues
      const checkPage = await this.browser.newPage();
      
      try {
        await checkPage.goto('https://ideogram.ai', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for login button/link using modern selector approach
        const loginButton = await checkPage.evaluate(() => {
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
        
        await checkPage.close();
        
        if (!loginButton) {
          console.log('✅ Already logged in to Ideogram');
          return true;
        }

        console.log('❌ Not logged in to Ideogram');
        return false;
      } catch (error) {
        await checkPage.close().catch(() => {});
        throw error;
      }
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
      
      // Close any existing browser instance first
      if (this.browser) {
        console.log('🔄 Closing existing browser instance...');
        await this.close();
      }
      
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
      // Check if browser is running, reinitialize if needed
      if (!this.browser || !this.isInitialized) {
        console.log('🔄 Browser not running, initializing...');
        await this.initialize(false); // Use visible browser for submission
      }

      // Check if logged in
      const loggedIn = await this.isLoggedIn();
      if (!loggedIn) {
        throw new Error('Not logged in to Ideogram. Please authenticate first.');
      }

      console.log('📝 Submitting prompt to Ideogram:', prompt.substring(0, 50) + '...');

      // Navigate to generate page
      await this.page.goto('https://ideogram.ai/t/explore', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

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
      await new Promise(resolve => setTimeout(resolve, 500));

      // Submit using Enter (most reliable)
      await this.page.keyboard.press('Enter');
      console.log('✅ Pressed Enter to submit');

      console.log('✅ Prompt submitted to Ideogram');

      // Wait to see if submission was successful
      await new Promise(resolve => setTimeout(resolve, 1500));

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
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isInitialized = false;
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
