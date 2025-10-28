const puppeteer = require('puppeteer-core');
const axios = require('axios');

/**
 * Midjourney Tab Service
 * Connects to an existing browser tab running Midjourney
 * Uses Chrome DevTools Protocol to control the tab
 */
class MidjourneyTabService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.debugPort = 9222; // Default Chrome debugging port
  }

  /**
   * Find Chrome/Brave/Arc debugging port by checking common ports
   */
  async findDebugPort() {
    const commonPorts = [9222, 9223, 9224, 9225];
    
    for (const port of commonPorts) {
      try {
        const response = await axios.get(`http://localhost:${port}/json/version`, { timeout: 1000 });
        if (response.data) {
          console.log(`✅ Found browser on port ${port}`);
          return port;
        }
      } catch (error) {
        // Port not available, try next
      }
    }
    
    throw new Error('No browser found with remote debugging enabled. Please start your browser with --remote-debugging-port=9222');
  }

  /**
   * Find Midjourney tab in the browser
   */
  async findMidjourneyTab() {
    try {
      const port = await this.findDebugPort();
      const response = await axios.get(`http://localhost:${port}/json`);
      const tabs = response.data;

      // Look for Midjourney tab
      const midjourneyTab = tabs.find(tab => 
        tab.url.includes('midjourney.com') && tab.type === 'page'
      );

      if (midjourneyTab) {
        console.log(`✅ Found Midjourney tab: ${midjourneyTab.title}`);
        return { port, tab: midjourneyTab };
      }

      return null;
    } catch (error) {
      console.error('Error finding Midjourney tab:', error.message);
      return null;
    }
  }

  /**
   * Connect to existing Midjourney tab
   */
  async connect() {
    console.log('🔍 Searching for Midjourney tab...');
    
    const result = await this.findMidjourneyTab();
    if (!result) {
      throw new Error('No Midjourney tab found. Please open Midjourney in your browser first.');
    }

    const { port, tab } = result;
    
    console.log(`🔌 Connecting to Midjourney tab via CDP...`);
    
    try {
      // Connect to the browser
      this.browser = await puppeteer.connect({
        browserWSEndpoint: tab.webSocketDebuggerUrl,
        defaultViewport: null
      });

      // Get all pages and find the Midjourney one
      const pages = await this.browser.pages();
      this.page = pages.find(p => p.url().includes('midjourney.com'));

      if (!this.page) {
        // If not found, use the target directly
        const targets = await this.browser.targets();
        const target = targets.find(t => t.url().includes('midjourney.com'));
        if (target) {
          this.page = await target.page();
        }
      }

      if (!this.page) {
        throw new Error('Could not access Midjourney page');
      }

      console.log('✅ Connected to Midjourney tab!');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to tab:', error);
      throw error;
    }
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn() {
    if (!this.page) {
      throw new Error('Not connected to Midjourney tab');
    }

    try {
      await this.page.waitForSelector('textarea[placeholder*="imagine"], textarea[placeholder*="Imagine"]', { 
        timeout: 3000 
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Submit a single prompt to Midjourney
   */
  async submitPrompt(prompt, autoSubmit = true) {
    if (!this.page) {
      await this.connect();
    }

    console.log(`📝 Submitting prompt: ${prompt.substring(0, 50)}...`);

    try {
      // Strip /imagine prompt: prefix if present
      const cleanPrompt = prompt.replace(/^\/imagine\s+prompt:\s*/i, '').trim();

      // Wait for and find the prompt textarea
      await this.page.waitForSelector('textarea', { timeout: 10000 });
      
      const textareas = await this.page.$$('textarea');
      if (textareas.length === 0) {
        throw new Error('No textarea found on page');
      }

      // Use the first textarea (usually the prompt input)
      const textarea = textareas[0];

      // Focus and clear
      await textarea.click();
      await this.page.keyboard.down('Meta'); // Cmd on Mac
      await this.page.keyboard.press('A');
      await this.page.keyboard.up('Meta');
      await this.page.keyboard.press('Backspace');

      // Type the prompt
      await textarea.type(cleanPrompt, { delay: 30 });

      if (autoSubmit) {
        // Submit with Enter
        await this.page.keyboard.press('Enter');
        console.log('✅ Prompt submitted!');
        
        // Wait a bit for submission to process
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('✅ Prompt typed (not submitted)');
      }

      return { success: true, prompt: cleanPrompt };
    } catch (error) {
      console.error('❌ Error submitting prompt:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit multiple prompts in batch
   */
  async submitBatch(prompts, delayBetween = 5000) {
    const results = [];
    
    console.log(`🚀 Starting batch submission of ${prompts.length} prompts...`);
    
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      console.log(`\n📋 Prompt ${i + 1}/${prompts.length}`);
      
      const result = await this.submitPrompt(prompt, true);
      results.push(result);

      // Wait between prompts (except after the last one)
      if (i < prompts.length - 1 && result.success) {
        console.log(`⏱️  Waiting ${delayBetween / 1000}s before next prompt...`);
        await new Promise(resolve => setTimeout(resolve, delayBetween));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n✅ Batch complete: ${successCount}/${prompts.length} prompts sent`);
    
    return {
      total: prompts.length,
      successful: successCount,
      failed: prompts.length - successCount,
      results
    };
  }

  /**
   * Disconnect from browser
   */
  async disconnect() {
    if (this.browser) {
      // Don't close the browser, just disconnect
      this.browser.disconnect();
      this.browser = null;
      this.page = null;
      console.log('👋 Disconnected from browser');
    }
  }

  /**
   * Get current page screenshot for debugging
   */
  async screenshot(filepath = 'midjourney-tab-debug.png') {
    if (this.page) {
      await this.page.screenshot({ path: filepath });
      console.log(`📸 Screenshot saved to ${filepath}`);
    }
  }
}

module.exports = MidjourneyTabService;
