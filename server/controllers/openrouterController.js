const fetch = require('node-fetch');
const NodeCache = require('node-cache');

// Cache model data for 1 hour (pricing doesn't change that often)
const modelCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Get all available models from OpenRouter
 */
async function getModels(req, res) {
  try {
    // Check cache first
    const cached = modelCache.get('all_models');
    if (cached) {
      return res.json({
        success: true,
        models: cached,
        cached: true
      });
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': req.headers.origin || 'http://localhost:3000',
        'X-Title': 'Midjourney Generator'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.data || [];

    // Cache the results
    modelCache.set('all_models', models);

    res.json({
      success: true,
      models,
      count: models.length,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching models from OpenRouter:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get top models by cheapest pricing
 * Returns top 30 cheapest models with detailed pricing
 */
async function getTopCheapest(req, res) {
  try {
    // Check cache first
    const cached = modelCache.get('top_cheapest');
    if (cached) {
      return res.json({
        success: true,
        models: cached,
        sortBy: 'cheapest',
        cached: true
      });
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': req.headers.origin || 'http://localhost:3000',
        'X-Title': 'Midjourney Generator'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const allModels = data.data || [];

    // Format models with detailed pricing
    const formattedModels = allModels
      .map(model => formatModelWithDetails(model))
      // Filter out models with no pricing or extremely high prices
      .filter(m => m.pricing.avgCostPer1M > 0 && m.pricing.avgCostPer1M < 1000)
      // Sort by average cost (cheapest first)
      .sort((a, b) => a.pricing.avgCostPer1M - b.pricing.avgCostPer1M)
      .slice(0, 30); // Top 30 cheapest

    // Cache the results
    modelCache.set('top_cheapest', formattedModels);

    res.json({
      success: true,
      models: formattedModels,
      count: formattedModels.length,
      sortBy: 'cheapest',
      cached: false
    });
  } catch (error) {
    console.error('Error fetching cheapest models from OpenRouter:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get top models sorted by popularity/usage
 * Based on OpenRouter's most commonly used models
 */
async function getTopPopular(req, res) {
  try {
    // Check cache first
    const cached = modelCache.get('top_popular');
    if (cached) {
      return res.json({
        success: true,
        models: cached,
        sortBy: 'popular',
        cached: true
      });
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': req.headers.origin || 'http://localhost:3000',
        'X-Title': 'Midjourney Generator'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const allModels = data.data || [];

    // Most popular models based on OpenRouter rankings (as of Oct 2025)
    // Prioritized by actual usage data from openrouter.ai/rankings
    const popularModelIds = [
      // Top tier (highest usage)
      'x-ai/grok-beta',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-5-sonnet-20240620',
      'google/gemini-flash-1.5',
      'google/gemini-pro-1.5',
      
      // High usage
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'meta-llama/llama-3.1-70b-instruct',
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-chat',
      
      // Popular for specific use cases
      'anthropic/claude-3-haiku',
      'anthropic/claude-3-opus',
      'qwen/qwen-2.5-72b-instruct',
      'qwen/qwen-2-vl-72b-instruct',
      'google/gemini-2.0-flash-exp:free',
      
      // Coding specific
      'openai/gpt-4-turbo',
      'anthropic/claude-2.1',
      'mistralai/mistral-large',
      
      // Vision/multimodal
      'openai/gpt-4-vision-preview',
      'google/gemini-pro-vision',
      
      // Additional popular choices
      'cohere/command-r-plus',
      'meta-llama/llama-3.1-405b-instruct',
      'perplexity/llama-3.1-sonar-large-128k-online',
      'anthropic/claude-instant-1.2',
      'mistralai/mixtral-8x7b-instruct',
      'mistralai/mistral-7b-instruct',
      'google/palm-2-chat-bison',
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'microsoft/phi-3-medium-128k-instruct',
      'databricks/dbrx-instruct'
    ];

    // Create a map for priority ordering
    const priorityMap = new Map(popularModelIds.map((id, index) => [id, index]));

    // Format and sort models by popularity
    const formattedModels = allModels
      .filter(m => popularModelIds.includes(m.id) && m.pricing?.prompt > 0)
      .map(model => formatModelWithDetails(model))
      .sort((a, b) => {
        const priorityA = priorityMap.get(a.id) ?? 999;
        const priorityB = priorityMap.get(b.id) ?? 999;
        return priorityA - priorityB;
      })
      .slice(0, 30); // Top 30 popular

    // Cache the results
    modelCache.set('top_popular', formattedModels);

    res.json({
      success: true,
      models: formattedModels,
      count: formattedModels.length,
      sortBy: 'popular',
      cached: false
    });
  } catch (error) {
    console.error('Error fetching popular models from OpenRouter:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Legacy endpoint - now returns popular models
 * Kept for backward compatibility
 */
async function getTopModels(req, res) {
  return getTopPopular(req, res);
}

/**
 * Helper function to format model with all details
 */
function formatModelWithDetails(model) {
  const promptPrice = parseFloat(model.pricing?.prompt || 0);
  const completionPrice = parseFloat(model.pricing?.completion || 0);
  
  // Calculate cost per 1M tokens
  const promptPer1M = (promptPrice * 1000000);
  const completionPer1M = (completionPrice * 1000000);
  
  // Average cost for display (weighted: 60% completion, 40% prompt)
  const avgCost = (promptPrice * 0.4 + completionPrice * 0.6) * 1000000;
  
  return {
    id: model.id,
    name: model.name,
    description: model.description || 'No description available',
    context_length: model.context_length || 0,
    pricing: {
      prompt: promptPrice,
      completion: completionPrice,
      promptPer1M: parseFloat(promptPer1M.toFixed(4)),
      completionPer1M: parseFloat(completionPer1M.toFixed(4)),
      avgCostPer1M: parseFloat(avgCost.toFixed(4))
    },
    supported_parameters: model.supported_parameters || [],
    architecture: model.architecture?.modality || 'text',
    top_provider: model.top_provider || {},
    per_request_limits: model.per_request_limits || null,
    
    // Enhanced display labels
    displayLabel: `${model.name} - $${avgCost.toFixed(4)}/1M`,
    displayLabelShort: model.name.split('/')[1] || model.name,
    priceLabel: `$${avgCost.toFixed(4)}/1M tokens`,
    promptPriceLabel: `Prompt: $${promptPer1M.toFixed(4)}/1M`,
    completionPriceLabel: `Completion: $${completionPer1M.toFixed(4)}/1M`,
    contextLabel: `${(model.context_length || 0).toLocaleString()} tokens`
  };
}

/**
 * Get user's credit balance and usage stats from OpenRouter
 * Tries multiple endpoints to get credit information
 */
async function getCredits(req, res) {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.json({
        success: false,
        credits: null,
        available: false,
        error: 'No API key configured'
      });
    }

    // Check cache first (5 minute TTL for credits)
    const cached = modelCache.get('user_credits');
    if (cached) {
      return res.json({
        success: true,
        ...cached,
        cached: true
      });
    }

    // Try the auth/key endpoint first
    let response = await fetch(`${OPENROUTER_BASE_URL}/auth/key`, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': req.headers.origin || 'http://localhost:3000',
        'X-Title': 'Midjourney Generator'
      }
    });

    let creditData = null;
    
    if (response.ok) {
      const data = await response.json();
      creditData = {
        label: data.data?.label || 'API Key',
        limit: data.data?.limit || null,
        usage: data.data?.usage || null,
        limit_remaining: data.data?.limit_remaining || null,
        is_free_tier: data.data?.is_free_tier || false,
        rate_limit: data.data?.rate_limit || {}
      };
    } else {
      // Try alternative: check if there's a /credits endpoint
      response = await fetch(`${OPENROUTER_BASE_URL}/credits`, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': req.headers.origin || 'http://localhost:3000'
        }
      });

      if (response.ok) {
        const data = await response.json();
        creditData = data.data || data;
      }
    }

    if (creditData) {
      // Calculate remaining balance
      const remaining = creditData.limit_remaining !== null 
        ? creditData.limit_remaining 
        : (creditData.limit !== null && creditData.usage !== null)
          ? creditData.limit - creditData.usage
          : null;

      const result = {
        success: true,
        available: true,
        credits: {
          ...creditData,
          remaining: remaining,
          formatted: {
            limit: creditData.limit ? `$${(creditData.limit).toFixed(2)}` : 'Unlimited',
            usage: creditData.usage ? `$${(creditData.usage).toFixed(2)}` : '$0.00',
            remaining: remaining !== null ? `$${remaining.toFixed(2)}` : 'Unknown'
          }
        }
      };

      // Cache for 5 minutes
      modelCache.set('user_credits', result, 300);

      return res.json(result);
    }

    // No credit data available
    res.json({
      success: true,
      available: false,
      credits: null,
      message: 'Credit information not available from API'
    });

  } catch (error) {
    console.error('Error fetching credits from OpenRouter:', error);
    res.json({
      success: false,
      credits: null,
      available: false,
      error: error.message
    });
  }
}

/**
 * Get top 10 models from Big 4 providers only (OpenAI, Anthropic, Google, X.AI)
 * Sorted by price (free first, then cheapest)
 */
async function getTopBigFour(req, res) {
  try {
    // Check cache first
    const cached = modelCache.get('top_big_four');
    if (cached) {
      return res.json({
        success: true,
        models: cached,
        sortBy: 'big_four',
        cached: true
      });
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': req.headers.origin || 'http://localhost:3000',
        'X-Title': 'Midjourney Generator'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const allModels = data.data || [];

    // Filter for Big 4 providers only
    const bigFourProviders = ['openai', 'anthropic', 'google', 'x-ai'];
    
    // Exclude unwanted models (experimental, preview, outdated versions)
    const excludePatterns = [
      /gemma-[0-9]/, // Exclude all Gemma models (too many variants)
      /experimental/i,
      /preview/i,
      /alpha/i,
      /test/i,
      /-001$/,  // Exclude version suffixes
      /-002$/,
      /-instruct-/i, // Exclude specific instruct variants that have base models
      /palm-2/i, // Old Google model
      /claude-instant/i, // Old Claude
      /claude-2\./i, // Old Claude 2.x
      /gpt-3\.5/i, // Old GPT 3.5
      /gpt-4-turbo-preview/i // Old preview
    ];
    
    // Only include these specific high-quality models
    const preferredModels = [
      // FREE MODELS - Always include if available
      'google/gemini-2.0-flash-exp:free',
      'google/gemini-flash-1.5-exp:free',
      'google/gemini-pro-1.5-exp:free',
      'anthropic/claude-3.5-sonnet:free',
      'anthropic/claude-3-haiku:free',
      'openai/gpt-4o-mini:free',
      
      // PAID MODELS - Best from each provider
      'openai/gpt-4o-mini',  // Default model
      'openai/gpt-5.1',      // If available
      'openai/gpt-4o',
      'openai/o1-mini',
      'openai/o1-preview',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3.5-haiku',
      'anthropic/claude-3-opus',
      'google/gemini-2.0-flash-exp',
      'google/gemini-pro-1.5',
      'google/gemini-flash-1.5',
      'x-ai/grok-beta',
      'x-ai/grok-2',
      'x-ai/grok-vision-beta'
    ];
    
    const bigFourModels = allModels
      .filter(model => {
        // Check if model ID starts with any of the big four providers
        const provider = model.id.split('/')[0].toLowerCase();
        if (!bigFourProviders.includes(provider)) return false;
        
        // Only include preferred models
        if (!preferredModels.includes(model.id)) return false;
        
        // Exclude patterns
        const shouldExclude = excludePatterns.some(pattern => pattern.test(model.id));
        return !shouldExclude;
      })
      .map(model => formatModelWithDetails(model))
      .filter(m => m.pricing.avgCostPer1M >= 0) // Include free models
      .sort((a, b) => {
        // Sort: Free first, then by price
        if (a.pricing.avgCostPer1M === 0 && b.pricing.avgCostPer1M > 0) return -1;
        if (a.pricing.avgCostPer1M > 0 && b.pricing.avgCostPer1M === 0) return 1;
        return a.pricing.avgCostPer1M - b.pricing.avgCostPer1M;
      })
      .slice(0, 10); // Top 10

    // Cache the results
    modelCache.set('top_big_four', bigFourModels);

    res.json({
      success: true,
      models: bigFourModels,
      count: bigFourModels.length,
      sortBy: 'big_four',
      cached: false
    });
  } catch (error) {
    console.error('Error fetching Big Four models from OpenRouter:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get generation statistics for a specific request
 */
async function getGenerationStats(req, res) {
  try {
    const { generationId } = req.params;

    const response = await fetch(`${OPENROUTER_BASE_URL}/generation?id=${generationId}`, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const stats = await response.json();

    res.json({
      success: true,
      stats: stats.data || stats
    });
  } catch (error) {
    console.error('Error fetching generation stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getModels,
  getTopModels,
  getTopPopular,
  getTopCheapest,
  getTopBigFour,
  getCredits,
  getGenerationStats
};
