# Global AI Model Selector with Live Pricing 💰

## Overview

A unified, app-wide AI model selection system with real-time pricing from OpenRouter API. This ensures you always know the cost of your AI operations and can choose the most economical model for your needs.

## Features

### ✅ Core Features
- **Single Source of Truth**: One model selection that syncs across the entire application
- **Live Pricing**: Real-time pricing data from OpenRouter API (top 20 models)
- **Auto-Refresh**: Pricing updates every hour automatically
- **Cost Transparency**: Shows both prompt and completion costs per 1M tokens
- **Persistent Selection**: Remembers your choice across sessions
- **Global Sync**: Changing the model anywhere updates it everywhere

### ✅ Pricing Display
- Average cost per 1M tokens (weighted: 60% completion, 40% prompt)
- Detailed breakdown showing:
  - Input (prompt) cost: `$X/1M tokens`
  - Output (completion) cost: `$Y/1M tokens`
  - Average cost: `$Z/1M tokens`

### ⚠️ Credits Display (Experimental)
- OpenRouter credit balance (if API supports it)
- Auto-refresh every 5 minutes
- Falls back gracefully if endpoint not available

## API Endpoints

### Backend Routes (`/api/openrouter/...`)

1. **GET `/models`** - Get all available models
   - Returns full list with pricing
   - Cached for 1 hour
   - No auth required

2. **GET `/models/top`** - Get top 20 models (sorted by cost)
   - Returns cheapest models first
   - Prioritizes popular models (GPT-4o-mini, Claude, Gemini, etc.)
   - Filtered: excludes extremely expensive models (>$1000/1M)
   - Cached for 1 hour
   - No auth required

3. **GET `/credits`** - Get user's OpenRouter credit balance
   - Requires authentication
   - Returns null if endpoint not available
   - Experimental feature

4. **GET `/usage/:generationId`** - Get generation statistics
   - Requires authentication
   - Returns token counts and actual costs for a specific request
   - Uses OpenRouter's `/api/v1/generation` endpoint

## Usage

### Frontend Integration

#### Basic Usage (Dashboard)
```javascript
// Create selector in any container
createModelSelector('container-id', {
    label: 'Select AI Model',
    showPrice: true,
    showCredits: true
});
```

#### Different Styles

**1. Full Featured (Default)**
```javascript
createModelSelector('container', {
    label: 'AI Model',
    showPrice: true,      // Show pricing breakdown
    showCredits: true     // Show credit balance
});
```

**2. Compact Version**
```javascript
createModelSelector('sidebar', {
    className: 'compact',
    showPrice: true,
    showCredits: false
});
```

**3. Inline Version**
```javascript
createModelSelector('toolbar', {
    className: 'inline',
    showPrice: true
});
```

**4. Minimal (Dropdown Only)**
```javascript
createModelSelector('settings', {
    className: 'minimal'
});
```

#### Listen for Model Changes
```javascript
// Any module can listen for model selection changes
window.globalModelSelector.onModelChange((model) => {
    console.log('Selected model:', model.name);
    console.log('Cost:', model.pricing.avgCostPer1M, 'per 1M tokens');
    
    // Update your module's settings
    updateAISettings(model);
});
```

#### Get Current Model
```javascript
const currentModel = window.globalModelSelector.getSelectedModel();
console.log(currentModel.id);          // e.g., "openai/gpt-4o-mini"
console.log(currentModel.pricing);     // Pricing object
```

#### Programmatically Select Model
```javascript
const model = window.globalModelSelector.getModelById('openai/gpt-4o-mini');
if (model) {
    window.globalModelSelector.selectModel(model);
}
```

### Backend Integration

#### OpenRouter Controller
```javascript
const openrouterController = require('./controllers/openrouterController');

// Get top 20 models with pricing
router.get('/models/top', openrouterController.getTopModels);

// Get user credits
router.get('/credits', auth, openrouterController.getCredits);
```

#### Using in AI Generation
```javascript
// In your AI chat or generation module
const model = window.globalModelSelector.getSelectedModel();

const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: model.id,  // Use selected model
        messages: [...]
    })
});
```

## Data Structure

### Model Object
```javascript
{
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Affordable and intelligent small model...",
    context_length: 128000,
    pricing: {
        prompt: 0.00000015,           // $0.15 per 1M tokens
        completion: 0.0000006,         // $0.60 per 1M tokens
        promptPer1M: 0.15,
        completionPer1M: 0.60,
        avgCostPer1M: 0.42             // Weighted average
    },
    supported_parameters: ["tools", "temperature", ...],
    architecture: {
        input_modalities: ["text", "image"],
        output_modalities: ["text"],
        tokenizer: "cl100k_base"
    },
    displayLabel: "GPT-4o Mini - $0.42/1M tokens"
}
```

### Credits Object (Experimental)
```javascript
{
    success: true,
    credits: {
        balance: 25.50,        // Current balance in USD
        currency: "USD"
    },
    available: true            // Whether endpoint is available
}
```

## Caching Strategy

- **Model Data**: Cached for 1 hour (server-side with node-cache)
- **Credits**: Refreshed every 5 minutes (client-side polling)
- **Selected Model**: Persisted in localStorage

## Cost Optimization Tips

1. **Sort by Price**: Models are sorted by average cost (cheapest first)
2. **Check Context Length**: Higher context = more tokens = higher cost
3. **Monitor Usage**: Use `/api/openrouter/usage/:id` to track actual costs
4. **Use Credits Display**: Keep track of remaining balance
5. **Free Models**: Look for models with `"free"` in the ID

## Priority Models (Always Included in Top 20)

These popular models are always included regardless of cost:
- `openai/gpt-4o-mini`
- `openai/gpt-4o`
- `anthropic/claude-3.5-sonnet`
- `anthropic/claude-3-haiku`
- `google/gemini-2.0-flash-exp:free`
- `meta-llama/llama-3.3-70b-instruct`
- `deepseek/deepseek-chat`
- `qwen/qwen-2.5-72b-instruct`
- `google/gemini-pro-1.5`

## Environment Variables

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-xxxxx...

# Optional (auto-detected from request)
HTTP_REFERER=https://your-domain.com
X_TITLE=Your App Name
```

## Files Created

### Backend
- `/server/routes/openrouter.js` - API routes
- `/server/controllers/openrouterController.js` - Controller logic

### Frontend
- `/public/js/global-ai-model.js` - Main selector component
- `/public/css/global-ai-model.css` - Styling

### Integration
- Modified `/server/index.js` - Added route registration
- Modified `/public/index.html` - Added selector to dashboard

## Migration from Old Selector

Old hardcoded selectors will automatically sync with the global selector:

**Before:**
```html
<select id="ai-model">
    <option value="openai/gpt-4o-mini">GPT-4o Mini - $0.375/M</option>
    <option value="anthropic/claude-3-haiku">Claude 3 Haiku - $0.50/M</option>
</select>
```

**After:**
```html
<div id="model-selector-container"></div>
<script>
    createModelSelector('model-selector-container', {
        showPrice: true
    });
</script>
```

## Troubleshooting

### Models Not Loading
```javascript
// Check console for errors
console.log(window.globalModelSelector.models);

// Manually reload
await window.globalModelSelector.loadModels();
```

### Credits Not Showing
- Credits endpoint may not be publicly available yet
- Check `/api/openrouter/credits` response
- Falls back gracefully with "N/A" display

### Stale Pricing
- Cache clears every hour
- Force refresh: Restart server or clear node-cache

## Future Enhancements

- [ ] Usage tracking per session
- [ ] Cost estimates before generation
- [ ] Monthly spending limits
- [ ] Model performance ratings
- [ ] Custom model filtering
- [ ] Favorites/pinned models

## Support

For issues or questions:
1. Check browser console for errors
2. Verify OPENROUTER_API_KEY is set
3. Test API endpoint directly: `/api/openrouter/models/top`
4. Check server logs for cache/API errors
