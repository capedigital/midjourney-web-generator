const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class MidjourneyBrowserService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.userDataDir = path.join(__dirname, '../../browser-profiles/midjourney');
    this.isInitialized = false;
  }

  /**
   * Initialize browser with persistent profile
   */
  async initialize(headless = true) {
    if (this.browser && this.isInitialized) {
      console.log('✅ Browser already initialized');
      return;
    }

    // Close any existing browser instance first
    if (this.browser) {
      console.log('🔄 Closing existing browser instance...');
      try {
        await this.browser.close();
      } catch (e) {
        console.log('⚠️ Error closing browser:', e.message);
      }
      this.browser = null;
      this.page = null;
      this.isInitialized = false;
    }

    console.log('🚀 Initializing Midjourney browser automation...');
    console.log(`   Headless mode: ${headless}`);
    console.log(`   User data dir: ${this.userDataDir}`);

    // Launch browser with persistent profile (skip CDP connection to avoid Cloudflare)
    const launchOptions = {
      headless: false,
      userDataDir: this.userDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-position=3000,3000',
        '--disable-popup-blocking'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: null
    };    if (!headless) {
      // Add args to keep window visible and in foreground
      launchOptions.args.push('--disable-background-mode');
      launchOptions.args.push('--disable-backgrounding-occluded-windows');
    }

    console.log('   Launch options:', JSON.stringify(launchOptions, null, 2));

    try {
      this.browser = await puppeteer.launch(launchOptions);
      console.log('✅ Browser launched successfully');
      
      // Verify browser is actually connected
      if (!this.browser.isConnected()) {
        throw new Error('Browser launched but not connected');
      }

      // Add disconnect handler
      this.browser.on('disconnected', () => {
        console.log('⚠️ Browser disconnected unexpectedly');
        this.browser = null;
        this.page = null;
        this.isInitialized = false;
      });

      this.page = await this.browser.newPage();
      console.log('✅ New page created');

      this.isInitialized = true;
      console.log('✅ Midjourney browser initialized with persistent profile');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error.message);
      console.error('   Stack:', error.stack);
      this.browser = null;
      this.page = null;
      this.isInitialized = false;
      throw error;
    }
  }  /**
   * Check if user is logged in to Midjourney
   */
  async isLoggedIn() {
    try {
      // Verify browser is still connected
      if (!this.browser || !this.browser.isConnected()) {
        console.log('⚠️ Browser not connected in isLoggedIn check');
        return false;
      }

      // Use the existing page instead of creating a new one (avoids Cloudflare)
      if (!this.page) {
        this.page = await this.browser.newPage();
      }

      const currentUrl = this.page.url();
      
      // If we're already on a Midjourney page, check the URL
      if (currentUrl.includes('midjourney.com')) {
        const isOnImaginePage = currentUrl.includes('/imagine');
        
        if (isOnImaginePage) {
          console.log('✅ Already logged in to Midjourney');
          return true;
        }
      }

      // Navigate to check login status
      try {
        await this.page.goto('https://www.midjourney.com/imagine', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });

        // Check if we're on the imagine page (logged in) or redirected to login
        const url = this.page.url();
        const isOnImaginePage = url.includes('/imagine');
        
        if (isOnImaginePage) {
          console.log('✅ Already logged in to Midjourney');
          return true;
        }

        console.log('❌ Not logged in to Midjourney');
        return false;
      } catch (error) {
        throw error;
      }
    } catch (error) {
      console.error('⚠️ Error checking Midjourney login status:', error.message);
      return false;
    }
  }

  /**
   * Open browser for manual login (setup)
   */
  async setupAuthentication() {
    try {
      console.log('🔐 Opening Midjourney for manual authentication...');
      
      // Close any existing browser instance first
      if (this.browser) {
        console.log('🔄 Closing existing browser instance...');
        await this.close();
      }
      
      // Initialize with visible browser
      await this.initialize(false);
      
      console.log('📱 Browser object:', this.browser ? 'exists' : 'null');
      console.log('📄 Page object:', this.page ? 'exists' : 'null');
      
      await this.page.goto('https://www.midjourney.com/auth/signin?callbackUrl=%2Fimagine', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      console.log('✅ Navigated to Midjourney login page');
      console.log('⏳ Browser opened for manual login...');
      console.log('Please log in to Midjourney. Browser will stay open.');
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
        message: 'Browser opened for manual authentication. Please log in to Midjourney.',
        sessionSaved: true
      };
    } catch (error) {
      console.error('❌ Failed to open browser for authentication:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Submit a prompt to Midjourney
   */
  async submitPrompt(prompt, options = {}) {
    try {
      // Check if browser is connected and running
      const needsReinitialization = !this.browser || 
                                    !this.isInitialized || 
                                    !this.browser.isConnected();
      
      if (needsReinitialization) {
        console.log('🔄 Browser not running or disconnected, initializing...');
        await this.initialize(false); // Use visible browser for submission
        
        // After initializing, navigate to the imagine page
        console.log('📍 Navigating to imagine page after initialization...');
        await this.page.goto('https://www.midjourney.com/imagine', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log('✅ Reusing existing browser instance');
      }

      // Check if logged in
      const loggedIn = await this.isLoggedIn();
      if (!loggedIn) {
        throw new Error('Not logged in to Midjourney. Please authenticate first using Setup Login in Settings.');
      }

      console.log('📝 Submitting prompt to Midjourney:', prompt.substring(0, 50) + '...');

      // Check if we're already on the imagine page
      const currentUrl = this.page.url();
      console.log('📍 Current URL:', currentUrl);
      
      if (!currentUrl.includes('/imagine') && !currentUrl.includes('midjourney.com')) {
        console.log('⚠️ Not on Midjourney page, please run Setup Login first');
        throw new Error('Browser is not on Midjourney. Please click "Setup Login" in Settings first.');
      }

      // Wait a moment for page to be ready
      await new Promise(resolve => setTimeout(resolve, 300));

      // Find the textarea
      const textareaSelectors = [
        'textarea[placeholder*="imagine"]',
        'textarea[placeholder*="Imagine"]',
        'textarea',
        'div[contenteditable="true"]'
      ];

      console.log('🔍 Looking for prompt input field...');
      let textarea = null;
      for (const selector of textareaSelectors) {
        try {
          console.log(`   Trying selector: ${selector}`);
          textarea = await this.page.$(selector);
          if (textarea) {
            console.log(`   ✅ Found textarea with selector: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`   ❌ Failed with selector ${selector}:`, e.message);
          // Continue to next selector
        }
      }

      if (!textarea) {
        console.error('❌ Could not find prompt input field after trying all selectors');
        // Take a screenshot for debugging
        await this.page.screenshot({ path: 'midjourney-textarea-not-found.png' });
        console.log('📸 Saved screenshot to midjourney-textarea-not-found.png');
        throw new Error('Could not find prompt input field');
      }

      await textarea.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Strip /imagine prompt: prefix if present (not needed for web form)
      const cleanPrompt = prompt.replace(/^\/imagine\s+prompt:\s*/i, '').trim();

      // Clear existing text
      await this.page.keyboard.down('Meta'); // Command key on Mac
      await this.page.keyboard.press('A');
      await this.page.keyboard.up('Meta');
      await this.page.keyboard.press('Backspace');
      
      await new Promise(resolve => setTimeout(resolve, 300));

      // Click the textarea to focus it
      await textarea.click();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Clear any existing text
      await this.page.keyboard.down('Meta'); // Command key on Mac
      await this.page.keyboard.press('A');
      await this.page.keyboard.up('Meta');
      await this.page.keyboard.press('Backspace');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Set value directly and trigger React events (INSTANT)
      console.log('⚡ Setting prompt value instantly...');
      await this.page.evaluate((text) => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
          // Set value
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          nativeInputValueSetter.call(textarea, text);
          
          // Trigger React events
          const inputEvent = new Event('input', { bubbles: true });
          const changeEvent = new Event('change', { bubbles: true });
          textarea.dispatchEvent(inputEvent);
          textarea.dispatchEvent(changeEvent);
        }
      }, cleanPrompt);

      console.log('✅ Prompt set in field');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Look for submit button (simplified)
      console.log('🔍 Looking for submit button...');
      const allButtons = await this.page.$$('button');
      console.log(`   Found ${allButtons.length} buttons on page`);
        
      let submitButton = null;
      // Try to find a button that looks like it might submit
      for (const btn of allButtons) {
        const btnText = await btn.evaluate(el => (el.textContent?.trim() || el.getAttribute('aria-label') || '').toLowerCase());
        console.log(`   Button text: "${btnText}"`);
        if (btnText.includes('imagine') || btnText.includes('generate') || btnText.includes('submit') || btnText.includes('send')) {
          submitButton = btn;
          console.log(`   ✅ Found submit button with text: "${btnText}"`);
          break;
        }
      }

      // Try clicking the button
      let submitted = false;
      if (submitButton) {
        try {
          console.log('🖱️ Clicking submit button...');
          await submitButton.click();
          submitted = true;
          console.log('✅ Clicked submit button');
        } catch (e) {
          console.log('⚠️ Failed to click button:', e.message);
        }
      }

      // If no button worked, try Enter key as last resort
      if (!submitted) {
        console.log('⌨️ No button found or click failed, trying keyboard shortcuts...');
        
        // Try regular Enter first
        await this.page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Then try Shift+Enter (this is what AppleScript uses for Midjourney!)
        await this.page.keyboard.down('Shift');
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.up('Shift');
      }

      console.log('✅ Prompt submitted');

      // Brief wait for submission to register
      await new Promise(resolve => setTimeout(resolve, 200));

      return {
        success: true,
        message: 'Prompt submitted successfully',
        prompt: prompt
      };

    } catch (error) {
      console.error('❌ Failed to submit prompt to Midjourney:', error.message);
      throw error;
    }
  }

  /**
   * Submit multiple prompts with delays
   */
  async submitBatch(prompts, delayMs = 3000, autoClose = false) {
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

    // Auto-close the browser window after all prompts are submitted (only if requested)
    if (autoClose && this.browser) {
      console.log('🔄 Auto-closing browser window after batch completion...');
      // Small delay before closing to ensure last prompt is submitted
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.close();
      console.log('✅ Browser window closed');
    } else {
      console.log('✅ Batch complete - browser window left open for next batch');
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
      console.log('✅ Midjourney browser closed');
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
      instance = new MidjourneyBrowserService();
    }
    return instance;
  },
  MidjourneyBrowserService
};
