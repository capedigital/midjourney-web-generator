/**
 * Background Service Worker
 * Manages WebSocket connection to local bridge server
 */

let ws = null;
let connected = false;
let authenticated = false;
let authToken = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000;

// Load saved token
chrome.storage.local.get(['bridgeToken'], (result) => {
  if (result.bridgeToken) {
    authToken = result.bridgeToken;
    connect();
  }
});

// Listen for token updates from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_TOKEN') {
    authToken = message.token;
    chrome.storage.local.set({ bridgeToken: authToken });
    connect();
    sendResponse({ success: true });
  } else if (message.type === 'GET_STATUS') {
    sendResponse({
      connected,
      authenticated,
      hasToken: !!authToken
    });
  } else if (message.type === 'DISCONNECT') {
    disconnect();
    sendResponse({ success: true });
  }
  return true; // Keep channel open for async response
});

function connect() {
  console.log('🔵 connect() called');
  
  if (!authToken) {
    console.log('⚠️ No auth token set');
    return;
  }

  console.log('🔵 Auth token present:', authToken.substring(0, 10) + '...');

  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    console.log('Already connected or connecting, readyState:', ws.readyState);
    return;
  }

  console.log('🔌 Connecting to local bridge at ws://127.0.0.1:3001...');

  try {
    ws = new WebSocket('ws://127.0.0.1:3001');
    console.log('🔵 WebSocket created, readyState:', ws.readyState);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      connected = true;
      reconnectAttempts = 0;
      
      // Authenticate
      send({
        type: 'auth',
        token: authToken,
        clientType: 'extension'
      });
      
      // Update badge
      chrome.action.setBadgeText({ text: '...' });
      chrome.action.setBadgeBackgroundColor({ color: '#f39c12' });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
      connected = false;
      authenticated = false;
      
      // Update badge
      chrome.action.setBadgeText({ text: '✗' });
      chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
      
      // Auto-reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`🔄 Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(() => connect(), RECONNECT_DELAY);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

  } catch (error) {
    console.error('❌ Failed to create WebSocket:', error);
  }
}

function disconnect() {
  if (ws) {
    ws.close(1000, 'User disconnected');
    ws = null;
  }
  connected = false;
  authenticated = false;
  
  chrome.action.setBadgeText({ text: '' });
}

function send(message) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('❌ WebSocket not connected');
    return false;
  }

  try {
    ws.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error('❌ Failed to send message:', error);
    return false;
  }
}

async function handleMessage(message) {
  console.log('📥 Received:', message.type);

  switch (message.type) {
    case 'auth_success':
      authenticated = true;
      console.log('✅ Authenticated as extension');
      
      // Update badge
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#2ecc71' });
      break;

    case 'submit_prompt':
      await handleSubmitPrompt(message);
      break;

    case 'submit_batch':
      await handleSubmitBatch(message);
      break;

    case 'ping':
      send({ type: 'pong' });
      break;

    default:
      console.warn('⚠️ Unknown message type:', message.type);
  }
}

async function handleSubmitPrompt(message) {
  console.log('📤 Submitting prompt to Midjourney...');
  
  try {
    // Find or create Midjourney tab
    const tab = await findOrCreateMidjourneyTab();
    
    // Inject and execute prompt submission
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: submitPromptToMidjourney,
      args: [message.prompt]
    });
    
    // Send result back
    send({
      type: 'prompt_result',
      messageId: message.messageId,
      success: result[0]?.result?.success || false,
      error: result[0]?.result?.error
    });
    
  } catch (error) {
    console.error('❌ Error submitting prompt:', error);
    send({
      type: 'prompt_result',
      messageId: message.messageId,
      success: false,
      error: error.message
    });
  }
}

async function handleSubmitBatch(message) {
  console.log('📤 Submitting batch of', message.prompts.length, 'prompts...');
  
  const results = [];
  const delayMs = message.delayMs || 5000;
  
  try {
    const tab = await findOrCreateMidjourneyTab();
    
    for (let i = 0; i < message.prompts.length; i++) {
      const prompt = message.prompts[i];
      console.log(`📤 Submitting prompt ${i + 1}/${message.prompts.length}`);
      
      try {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: submitPromptToMidjourney,
          args: [prompt]
        });
        
        results.push({
          prompt,
          success: result[0]?.result?.success || false,
          error: result[0]?.result?.error
        });
        
      } catch (error) {
        results.push({
          prompt,
          success: false,
          error: error.message
        });
      }
      
      // Delay between prompts
      if (i < message.prompts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Send batch result
    send({
      type: 'batch_result',
      messageId: message.messageId,
      success: true,
      results,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length
    });
    
  } catch (error) {
    console.error('❌ Error submitting batch:', error);
    send({
      type: 'batch_result',
      messageId: message.messageId,
      success: false,
      error: error.message,
      results
    });
  }
}

async function findOrCreateMidjourneyTab() {
  // Try to find existing Midjourney tab
  const tabs = await chrome.tabs.query({ url: 'https://www.midjourney.com/*' });
  
  if (tabs.length > 0) {
    // Activate existing tab
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
    return tabs[0];
  }
  
  // Create new tab
  const tab = await chrome.tabs.create({
    url: 'https://www.midjourney.com',
    active: true
  });
  
  // Wait for page to load
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

/**
 * This function runs IN the Midjourney page context
 * Note: This is injected code, not background script
 */
function submitPromptToMidjourney(prompt) {
  try {
    // Find the prompt input textarea
    const textarea = document.querySelector('textarea[placeholder*="prompt"], textarea[data-testid="prompt-input"], .prompt-input textarea');
    
    if (!textarea) {
      return { success: false, error: 'Prompt input not found. Are you logged in to Midjourney?' };
    }
    
    // Set the prompt value
    textarea.value = prompt;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Find and click submit button
    const submitButton = document.querySelector('button[type="submit"], button[aria-label*="Submit"], .submit-button');
    
    if (submitButton) {
      submitButton.click();
      return { success: true };
    } else {
      // Fallback: Try Enter key
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      textarea.dispatchEvent(enterEvent);
      return { success: true, method: 'keyboard' };
    }
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ Extension installed');
  chrome.action.setBadgeText({ text: '' });
});
