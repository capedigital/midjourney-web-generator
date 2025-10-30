const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class IdeogramBrowserService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.userDataDir = path.join(__dirname, '../../browser-profiles/ideogram');
    this.isInitialized = false;
    this.currentStatus = 'idle'; // idle, initializing, submitting, batch
    this.batchProgress = { current: 0, total: 0, currentPrompt: '' };
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
   * Initialize browser with persistent profile
   */
  async initialize(headless = false) {
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
        '--disable-blink-features=AutomationControlled',
        '--window-position=100,100',
        '--disable-infobars'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
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
      
      // Check if browser is already initialized and connected
      const browserConnected = this.browser && this.browser.isConnected && this.browser.isConnected();
      
      if (browserConnected && this.isInitialized) {
        console.log('✅ Browser already open, navigating to login page...');
        // Don't close - just navigate to login
        await this.page.goto('https://ideogram.ai/login', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
      } else {
        // Force close any existing browser instance only if it's not connected
        if (this.browser) {
          console.log('🔄 Closing stale browser instance...');
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
      }

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
        await this.page.goto('https://ideogram.ai', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Wait a bit for login state to be recognized
        await new Promise(resolve => setTimeout(resolve, 2000));
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
          textarea.focus();
        }
      }, cleanPrompt);

      // Add a few space keypresses to trigger validation/recognition
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.page.keyboard.press('Space');
      await new Promise(resolve => setTimeout(resolve, 50));
      await this.page.keyboard.press('Backspace');
      
      console.log('✅ Prompt pasted into field with validation trigger');

      // Verify the textarea kept the value. Some SPA/react inputs ignore direct value assignment.
      let currentValue = await this.page.evaluate(() => {
        const ta = document.querySelector('textarea');
        return ta ? ta.value : null;
      });

      if (currentValue !== cleanPrompt) {
        console.log('⚠️ Programmatic paste did not stick, falling back to simulated typing');

        // Focus the textarea and type the prompt slowly so React-controlled inputs pick it up
        try {
          await textarea.focus();
        } catch (e) {
          // If textarea handle is stale, try to re-select
          await this.page.evaluate(() => {
            const ta = document.querySelector('textarea');
            if (ta) ta.focus();
          });
        }

        // Give a tiny pause before typing
        await new Promise(resolve => setTimeout(resolve, 200));

        // Type each character with a small delay to mimic a user
        await this.page.keyboard.type(cleanPrompt, { delay: 25 });

        // Dispatch input/change events after typing
        await this.page.evaluate(() => {
          const ta = document.querySelector('textarea');
          if (ta) {
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            ta.dispatchEvent(new Event('change', { bubbles: true }));
            ta.focus();
          }
        });

        // Re-read value for verification
        currentValue = await this.page.evaluate(() => {
          const ta = document.querySelector('textarea');
          return ta ? ta.value : null;
        });

        if (currentValue !== cleanPrompt) {
          console.log('❌ After typing fallback the textarea still does not match prompt. Current value length:', currentValue ? currentValue.length : 0);
        } else {
          console.log('✅ Typing fallback succeeded and textarea now contains the prompt');
        }
      } else {
        console.log('✅ Prompt paste verified');
      }

      // Wait for button to become enabled instead of fixed delay
      console.log('⏳ Waiting for Generate button to become enabled...');
      try {
        await this.page.waitForFunction(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const generateBtn = buttons.find(btn => {
            const text = btn.textContent || '';
            return text.toLowerCase().includes('generate') || text.toLowerCase().includes('create');
          });
          return generateBtn && !generateBtn.disabled;
        }, { timeout: 3000 });
        console.log('✅ Generate button is enabled');
      } catch (e) {
        console.log('⚠️ Generate button did not enable within 3s, attempting click anyway');
      }

      // Try multiple methods to submit
      let submitted = false;

      // Log textarea value immediately before attempting to submit so we can debug SPA clearing
      try {
        const beforeClickValue = await this.page.evaluate(() => {
          const ta = document.querySelector('textarea');
          return ta ? ta.value : null;
        });
        console.log('🔎 Textarea length before submit attempt:', beforeClickValue ? beforeClickValue.length : 0);
        if (beforeClickValue !== cleanPrompt) {
          console.log('⚠️ Textarea content differs from expected before submit. Waiting a bit to allow UI to settle...');
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } catch (e) {
        console.log('⚠️ Could not read textarea before submit:', e.message);
      }

      // Method 1: Click Generate button (comprehensive search like Electron app)
      try {
        const buttonInfo = await this.page.evaluate(() => {
          // Look for Generate button by text content
          const buttons = Array.from(document.querySelectorAll('button'));
          const generateBtn = buttons.find(btn => {
            const text = btn.textContent || '';
            return text.toLowerCase().includes('generate') ||
                   text.toLowerCase().includes('create');
          });
          
          if (generateBtn) {
            // Check visibility and enabled state
            const isVisible = generateBtn.offsetParent !== null;
            const isEnabled = !generateBtn.disabled;
            const computedStyle = window.getComputedStyle(generateBtn);
            const isDisplayed = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
            
            const state = { isVisible, isEnabled, isDisplayed, disabled: generateBtn.disabled, text: generateBtn.textContent.trim() };
            
            if (isEnabled && isVisible && isDisplayed) {
              // Scroll button into view first
              generateBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
              
              // Focus the button first
              generateBtn.focus();
              
              // Click it
              generateBtn.click();
              
              return { clicked: true, state };
            } else {
              return { clicked: false, state, reason: 'Button not ready' };
            }
          }
          
          return { clicked: false, state: null, reason: 'Button not found' };
        });

        console.log('🔎 Button info:', JSON.stringify(buttonInfo, null, 2));

        if (buttonInfo.clicked) {
          console.log('✅ Clicked Generate button');
          submitted = true;
          
          // Wait a moment after clicking, then check for error messages
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Check if Ideogram is showing an error
          const errorCheck = await this.page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const textareaValue = textarea ? textarea.value : null;
            
            // Look for error messages
            const errorElements = Array.from(document.querySelectorAll('*')).filter(el => {
              const text = el.textContent || '';
              return text.toLowerCase().includes('please enter') || 
                     text.toLowerCase().includes('prompt') && text.toLowerCase().includes('continue');
            });
            
            return {
              textareaValueLength: textareaValue ? textareaValue.length : 0,
              hasError: errorElements.length > 0,
              errorText: errorElements.length > 0 ? errorElements[0].textContent.trim() : null
            };
          });
          
          console.log('🔎 Post-click check:', JSON.stringify(errorCheck, null, 2));
          
          if (errorCheck.hasError || errorCheck.textareaValueLength === 0) {
            console.log('⚠️ Ideogram cleared textarea after click. Attempting recovery...');
            
            // Recovery: Re-paste the prompt and click again
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Re-paste using keyboard typing (more reliable than programmatic set)
            const textarea = await this.page.$('textarea');
            if (textarea) {
              await textarea.click();
              await new Promise(resolve => setTimeout(resolve, 30));
              
              // Clear any existing text
              await this.page.keyboard.down('Meta');
              await this.page.keyboard.press('A');
              await this.page.keyboard.up('Meta');
              await this.page.keyboard.press('Backspace');
              await new Promise(resolve => setTimeout(resolve, 30));
              
              // Type the prompt at 2ms/char for ~1.3s on 650-char prompts
              console.log('🔄 Re-typing prompt after clear...');
              await this.page.keyboard.type(cleanPrompt, { delay: 2 });
              
              // Add validation trigger
              await this.page.keyboard.press('Space');
              await new Promise(resolve => setTimeout(resolve, 20));
              await this.page.keyboard.press('Backspace');
              
              // Wait for button to be enabled instead of fixed delay
              console.log('⏳ Waiting for Generate button to become enabled after recovery...');
              try {
                await this.page.waitForFunction(() => {
                  const buttons = Array.from(document.querySelectorAll('button'));
                  const generateBtn = buttons.find(btn => {
                    const text = btn.textContent || '';
                    return text.toLowerCase().includes('generate') || text.toLowerCase().includes('create');
                  });
                  return generateBtn && !generateBtn.disabled;
                }, { timeout: 2000 });
                console.log('✅ Button enabled after recovery');
              } catch (e) {
                console.log('⚠️ Button did not enable, clicking anyway');
              }
              
              // Verify it stuck this time
              const verifyValue = await this.page.evaluate(() => {
                const ta = document.querySelector('textarea');
                return ta ? ta.value : null;
              });
              
              console.log('🔎 After re-type, textarea length:', verifyValue ? verifyValue.length : 0);
              
              if (verifyValue && verifyValue.length > 0) {
                // Try clicking Generate again
                
                const secondClick = await this.page.evaluate(() => {
                  const buttons = Array.from(document.querySelectorAll('button'));
                  const generateBtn = buttons.find(btn => {
                    const text = btn.textContent || '';
                    return text.toLowerCase().includes('generate') ||
                           text.toLowerCase().includes('create');
                  });
                  
                  if (generateBtn && !generateBtn.disabled) {
                    generateBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
                    generateBtn.focus();
                    generateBtn.click();
                    return true;
                  }
                  return false;
                });
                
                if (secondClick) {
                  console.log('✅ Recovery click successful');
                  // Brief wait for submission to process
                  await new Promise(resolve => setTimeout(resolve, 200));
                  
                  const finalCheck = await this.page.evaluate(() => {
                    const ta = document.querySelector('textarea');
                    return { valueLength: ta ? ta.value.length : 0 };
                  });
                  
                  console.log('🔎 Final check - textarea length:', finalCheck.valueLength);
                } else {
                  console.log('⚠️ Recovery click failed - button not ready');
                }
              } else {
                console.log('❌ Re-type failed - textarea still empty');
              }
            }
          }
        } else {
          console.log('⚠️ Generate button not ready, waiting and retrying...');
          
          // Wait longer for button to become enabled
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const retryInfo = await this.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const generateBtn = buttons.find(btn => {
              const text = btn.textContent || '';
              return text.toLowerCase().includes('generate') ||
                     text.toLowerCase().includes('create');
            });
            
            if (generateBtn) {
              const isVisible = generateBtn.offsetParent !== null;
              const isEnabled = !generateBtn.disabled;
              const computedStyle = window.getComputedStyle(generateBtn);
              const isDisplayed = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
              
              const state = { isVisible, isEnabled, isDisplayed, text: generateBtn.textContent.trim() };
              
              if (isEnabled && isVisible && isDisplayed) {
                generateBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
                generateBtn.focus();
                generateBtn.click();
                return { clicked: true, state };
              }
              return { clicked: false, state };
            }
            return { clicked: false, state: null };
          });
          
          console.log('🔎 Retry button info:', JSON.stringify(retryInfo, null, 2));
          
          if (retryInfo.clicked) {
            console.log('✅ Clicked Generate button on retry');
            submitted = true;
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Check for error after retry too
            const errorCheck = await this.page.evaluate(() => {
              const textarea = document.querySelector('textarea');
              const textareaValue = textarea ? textarea.value : null;
              const errorElements = Array.from(document.querySelectorAll('*')).filter(el => {
                const text = el.textContent || '';
                return text.toLowerCase().includes('please enter') || 
                       text.toLowerCase().includes('prompt') && text.toLowerCase().includes('continue');
              });
              return {
                textareaValueLength: textareaValue ? textareaValue.length : 0,
                hasError: errorElements.length > 0,
                errorText: errorElements.length > 0 ? errorElements[0].textContent.trim() : null
              };
            });
            console.log('🔎 Post-retry check:', JSON.stringify(errorCheck, null, 2));
          }
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
   * Get current service status
   */
  getStatus() {
    return {
      browserRunning: this.browser && this.browser.isConnected(),
      isInitialized: this.isInitialized,
      status: this.currentStatus,
      batchProgress: this.batchProgress
    };
  }

  /**
   * Submit multiple prompts with delays
   */
  async submitBatch(prompts, delayMs = 3000, autoClose = true) {
    const results = [];
    this.currentStatus = 'batch';
    this.batchProgress = { current: 0, total: prompts.length, currentPrompt: '' };

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      this.batchProgress.current = i + 1;
      this.batchProgress.currentPrompt = prompt.substring(0, 50) + '...';
      
      console.log(`📤 Submitting prompt ${i + 1}/${prompts.length}`);

      try {
        this.currentStatus = 'submitting';
        const result = await this.submitPrompt(prompt);
        results.push(result);
        this.currentStatus = 'batch';

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

    this.currentStatus = 'idle';
    this.batchProgress = { current: 0, total: 0, currentPrompt: '' };

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
