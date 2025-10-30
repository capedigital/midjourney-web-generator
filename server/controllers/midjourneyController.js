const { getInstance: getMidjourneyService } = require('../services/midjourneyBrowserService');
const promptsService = require('../services/promptsService');

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
    
    // Initialize if needed - use headless mode on production (Railway)
    if (!service.isInitialized) {
      const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
      await service.initialize(isProduction); // headless on Railway, visible locally
    }
    
    const result = await service.submitPrompt(prompt, options?.autoSubmit !== false);
    
    // Save to database if user is authenticated
    if (req.user && req.user.id) {
      try {
        await promptsService.createSession({
          userId: req.user.id,
          inputText: prompt,
          prompts: [{ text: prompt, index: 1 }],
          model: 'midjourney-browser'
        });
        console.log('✅ Saved prompt to database for user', req.user.id);
      } catch (dbError) {
        console.error('⚠️ Failed to save prompt to database:', dbError.message);
        // Don't fail the request if database save fails
      }
    }
    
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
    
    // Initialize if needed - use headless mode on production (Railway)
    if (!service.isInitialized) {
      const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
      await service.initialize(isProduction); // headless on Railway, visible locally
    }
    
    const results = await service.submitBatch(prompts, delayMs, autoClose);
    
    const successCount = results.filter(r => r.success).length;
    
    // Save batch to database if user is authenticated
    if (req.user && req.user.id) {
      try {
        // Extract base prompts (strip all Midjourney parameters)
        const basePrompts = prompts.map(p => {
          const promptText = typeof p === 'string' ? p : p.text || p.prompt || String(p);
          
          // Remove /imagine prompt: prefix
          let cleanPrompt = promptText.replace(/^\/imagine\s+prompt:\s*/i, '').trim();
          
          // Remove all Midjourney parameters using the same regex as Electron app
          cleanPrompt = cleanPrompt.replace(/\s+(--ar\s+[\d:]+|--stylize\s+\d+|--chaos\s+\d+|--c\s+\d+|--weird\s+\d+|--w\s+\d+|--style\s+\w+|--niji\s+\d+|--turbo|--fast|--relax|--v\s+[\d\.]+|--zoom\s+[\d\.]+|--draft|--standard|--mode\s+\w+|--sw\s+\d+|--no\s+[\w\s,]+|--p\s+\w+|--sref\s+[\w\-:/.]+|--q\s+[\d\.]+)/g, '');
          
          return cleanPrompt.trim();
        });

        await promptsService.createSession({
          userId: req.user.id,
          inputText: `Batch of ${prompts.length} prompts sent to Midjourney`,
          prompts: basePrompts,
          model: 'midjourney-browser-batch'
        });
        console.log(`✅ Saved batch of ${prompts.length} base prompts to database for user`, req.user.id);
      } catch (dbError) {
        console.error('⚠️ Failed to save batch to database:', dbError.message);
        // Don't fail the request if database save fails
      }
    }
    
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
