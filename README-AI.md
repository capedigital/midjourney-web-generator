# AI Assistant Development Notes

## Adding a New Image Platform - PROCESS

### ⚠️ CRITICAL: Check These FIRST (5-minute checklist)

When adding a new platform and getting errors:

1. **Check extension manifest permissions** (`prompt-bridge-extension/manifest.json`):
   - Add platform URL to `host_permissions` array
   - Add platform URL to `content_scripts.matches` array
   - Example: `"https://newplatform.com/*"`

2. **Check hardcoded URL logic in background.js**:
   - Search for any `service === 'ideogram' ? ... : 'midjourney'` patterns
   - These ALWAYS need to include the new platform
   - Look for tab query logic that defaults to Midjourney

3. **Check the actual error messages** instead of assuming complex issues:
   - "Cannot access contents" = manifest permissions
   - "prompts going to wrong platform" = hardcoded routing logic

### Local Development Setup

**IMPORTANT: You need TWO processes running for testing:**

1. **Main web app** (port 3000):
   ```bash
   cd /Users/jdemott/Applications/midjourneyGenerator/web-app
   npm start
   ```

2. **Local bridge server** (port 3001):
   ```bash
   cd /Users/jdemott/Applications/midjourneyGenerator/web-app/local-bridge
   npm start
   ```

3. **Get auth token**:
   ```bash
   curl -s http://127.0.0.1:3001/token
   ```

4. **Configure extension**:
   - Go to extension popup
   - Paste token from step 3
   - Connect to local bridge

**Without the local bridge, the extension won't work and you can't test platform automation!**

### Step-by-Step Process (should take 15 minutes max)

#### 1. Backend/Database (if needed)
- Add platform to database enum/constraints
- Update validation in userPreferencesService.js

#### 2. Web App Frontend
- Add platform to `public/js/components/top-nav-model-selector.js`:
  - Add to platforms array with config
  - Set `supportsParameters: false` for non-MJ platforms
- Add button to HTML if needed
- Add click handler in app.js or generator.js

#### 3. Extension Permissions (CRITICAL)
```json
// manifest.json
{
  "host_permissions": [
    "https://www.midjourney.com/*",
    "https://ideogram.ai/*",
    "https://newplatform.com/*"  // ADD THIS
  ],
  "content_scripts": [
    {
      "matches": [
        "https://www.midjourney.com/*",
        "https://ideogram.ai/*",
        "https://newplatform.com/*"  // ADD THIS
      ]
    }
  ]
}
```

#### 4. Extension Background Script
```javascript
// background.js - Add to handleSubmitPrompt and handleSubmitBatch
if (service === 'ideogram') {
  tab = await findOrCreateIdeogramTab();
  submitFunc = submitPromptToIdeogram;
} else if (service === 'newplatform') {  // ADD THIS
  tab = await findOrCreateNewPlatformTab();
  submitFunc = submitPromptToNewPlatform;
} else {
  // Midjourney default
}

// Also update URL routing in batch processing:
let queryUrl;
if (service === 'ideogram') {
  queryUrl = 'https://ideogram.ai/*';
} else if (service === 'newplatform') {  // ADD THIS
  queryUrl = 'https://newplatform.com/*';
} else {
  queryUrl = 'https://www.midjourney.com/*';
}
```

#### 5. Tab Creation Function
Copy the working Ideogram pattern:
```javascript
async function findOrCreateNewPlatformTab() {
  const tabs = await chrome.tabs.query({ url: 'https://newplatform.com/*' });
  
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
    return tabs[0];
  }
  
  const tab = await chrome.tabs.create({
    url: 'https://newplatform.com/generate',
    active: true
  });
  
  // Wait for page load
  await new Promise(resolve => {
    const listener = (tabId, info) => {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
  
  return tab;
}
```

#### 6. Prompt Submission Function
Copy the working Ideogram pattern (NOT the complex Firefly polling):
```javascript
function submitPromptToNewPlatform(prompt) {
  try {
    // Find textarea with multiple selectors
    let textarea = document.querySelector('textarea[placeholder*="Describe"]');
    if (!textarea) textarea = document.querySelector('textarea');
    
    if (!textarea) {
      return { success: false, error: 'Textarea not found' };
    }
    
    // Set value with React events
    textarea.value = prompt;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(textarea, prompt);
    
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Submit with Enter key (simplest approach)
    setTimeout(() => {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
      });
      textarea.dispatchEvent(enterEvent);
    }, 300);
    
    return { success: true, method: 'keyboard' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Debugging Process

1. **Always check extension console first**: `chrome://extensions/` → Service Worker
2. **Check web app console**: Look for batch responses and bridge messages
3. **Check platform page console**: Look for injection logs
4. **Read error messages literally**: Don't assume complex problems

### Common Mistakes Made

1. **Building complex polling instead of copying simple working pattern**
2. **Not checking manifest permissions when getting "cannot access" errors**
3. **Not checking hardcoded URL logic in batch processing**
4. **Overthinking the prompt submission - Enter key works for most platforms**
5. **Not systematically comparing working vs broken code paths**

### Testing Checklist

After implementation:
1. Extension loads without errors
2. Chrome asks for new permissions when reloading extension
3. Platform tab opens correctly
4. Individual prompt submission works
5. Batch submission works (all prompts go to correct platform)
6. Extension console shows successful injection logs
7. Platform page console shows prompt filling logs

### Key Files to Update

1. `manifest.json` - permissions
2. `background.js` - routing and functions
3. `public/js/components/top-nav-model-selector.js` - platform config
4. `public/js/app.js` or `generator.js` - button handlers
5. `public/index.html` - buttons (if needed)

### Time Estimate

- Simple platform (copy Ideogram pattern): **15 minutes**
- Complex platform with custom UI: **30 minutes max**

If it takes longer, you're overcomplicating it.