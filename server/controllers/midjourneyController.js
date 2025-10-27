const { getInstance: getMidjourneyService } = require('../services/midjourneyBrowserService');

/**
 * Initialize Midjourney browser (opens persistent browser window)
 */
async function initialize(req, res) {
  try {
    const { headless = false } = req.body; // Default to visible for login
    const service = getMidjourneyService();
    
    await service.initialize(headless);
    
    res.json({
      success: true,
      message: 'Midjourney browser initialized. Please log in if needed.'
    });
  } catch (error) {
    console.error('Error initializing Midjourney browser:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Setup authentication - opens browser for manual login
 */
async function setupAuth(req, res) {
  try {
    const service = getMidjourneyService();
    await service.initialize(false); // Visible browser
    
    // Navigate to Midjourney
    await service.page.goto('https://www.midjourney.com', { waitUntil: 'networkidle2' });
    
    res.json({
      success: true,
      message: 'Browser opened. Please log in to Midjourney in the browser window.'
    });
  } catch (error) {
    console.error('Error setting up Midjourney authentication:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Check login status
 */
async function checkLogin(req, res) {
  try {
    const service = getMidjourneyService();
    
    if (!service.isInitialized) {
      return res.json({
        success: true,
        loggedIn: false,
        message: 'Browser not initialized'
      });
    }
    
    const loggedIn = await service.isLoggedIn();
    
    res.json({
      success: true,
      loggedIn
    });
  } catch (error) {
    console.error('Error checking Midjourney login:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Login to Midjourney
 */
async function login(req, res) {
  try {
    const service = getMidjourneyService();
    await service.initialize(false); // Visible for login
    
    res.json({
      success: true,
      message: 'Browser opened for login. Please complete authentication in the browser window.'
    });
  } catch (error) {
    console.error('Error logging in to Midjourney:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Submit a single prompt
 */
async function submitPrompt(req, res) {
  try {
    const { prompt, options } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    const service = getMidjourneyService();
    
    // Initialize if needed
    if (!service.isInitialized) {
      await service.initialize(false);
    }
    
    const result = await service.submitPrompt(prompt, options?.autoSubmit !== false);
    
    res.json(result);
  } catch (error) {
    console.error('Error submitting prompt to Midjourney:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Submit multiple prompts
 */
async function submitBatch(req, res) {
  try {
    const { prompts, delayMs = 5000, autoClose = true } = req.body;
    
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prompts array is required'
      });
    }
    
    const service = getMidjourneyService();
    
    // Initialize if needed (visible mode to debug Cloudflare)
    if (!service.isInitialized) {
      await service.initialize(false); // false = visible
    }
    
    const results = await service.submitBatch(prompts, delayMs, autoClose);
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Submitted ${successCount}/${prompts.length} prompts successfully`,
      total: prompts.length,
      successful: successCount,
      failed: prompts.length - successCount,
      results
    });
  } catch (error) {
    console.error('Error submitting batch to Midjourney:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Close browser
 */
async function close(req, res) {
  try {
    const service = getMidjourneyService();
    await service.close();
    
    res.json({
      success: true,
      message: 'Midjourney browser closed'
    });
  } catch (error) {
    console.error('Error closing Midjourney browser:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  initialize,
  setupAuth,
  checkLogin,
  login,
  submitPrompt,
  submitBatch,
  close
};
