const { getInstance: getIdeogramService } = require('../services/ideogramBrowserService');

/**
 * Initialize Ideogram browser
 */
async function initialize(req, res) {
  try {
    const { headless = true } = req.body;
    const service = getIdeogramService();
    
    await service.initialize(headless);
    
    res.json({
      success: true,
      message: 'Ideogram browser initialized'
    });
  } catch (error) {
    console.error('Error initializing Ideogram browser:', error);
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
    const service = getIdeogramService();
    const result = await service.setupAuthentication();
    
    res.json(result);
  } catch (error) {
    console.error('Error setting up Ideogram authentication:', error);
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
    const service = getIdeogramService();
    
    if (!service.isInitialized) {
      await service.initialize();
    }
    
    const loggedIn = await service.isLoggedIn();
    
    res.json({
      success: true,
      loggedIn
    });
  } catch (error) {
    console.error('Error checking Ideogram login:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Login to Ideogram
 */
async function login(req, res) {
  try {
    const service = getIdeogramService();
    
    if (!service.isInitialized) {
      await service.initialize(false); // Show browser for manual login
    }
    
    const success = await service.login();
    
    if (success) {
      res.json({
        success: true,
        message: 'Successfully logged in to Ideogram'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Login failed or timed out'
      });
    }
  } catch (error) {
    console.error('Error logging in to Ideogram:', error);
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
    
    const service = getIdeogramService();
    const result = await service.submitPrompt(prompt, options);
    
    res.json(result);
  } catch (error) {
    console.error('Error submitting prompt to Ideogram:', error);
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
    const { prompts, delayMs = 3000 } = req.body;
    
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prompts array is required'
      });
    }
    
    const service = getIdeogramService();
    const results = await service.submitBatch(prompts, delayMs);
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Submitted ${successCount}/${prompts.length} prompts successfully`,
      results
    });
  } catch (error) {
    console.error('Error submitting batch to Ideogram:', error);
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
    const service = getIdeogramService();
    await service.close();
    
    res.json({
      success: true,
      message: 'Ideogram browser closed'
    });
  } catch (error) {
    console.error('Error closing Ideogram browser:', error);
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
