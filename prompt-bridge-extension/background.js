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
let keepAliveInterval = null;

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
      
      // Start keep-alive to prevent service worker from going idle
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      keepAliveInterval = setInterval(() => {
        if (connected && authenticated) {
          send({ type: 'ping' });
        }
      }, 20000); // Ping every 20 seconds
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
      
      // Stop keep-alive
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      
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
  const service = message.service || 'midjourney'; // Default to midjourney
  console.log(`📤 Submitting prompt to ${service}...`);
  
  try {
    let tab, submitFunc;
    
    // Determine which service to use
    if (service === 'ideogram') {
      tab = await findOrCreateIdeogramTab();
      submitFunc = submitPromptToIdeogram;
    } else {
      tab = await findOrCreateMidjourneyTab();
      submitFunc = submitPromptToMidjourney;
    }
    
    // Inject and execute prompt submission
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: submitFunc,
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
  const service = message.service || 'midjourney'; // Default to midjourney
  console.log(`📤 Submitting batch of ${message.prompts.length} prompts to ${service}...`);
  
  const results = [];
  const delayMs = message.delayMs || 5000;
  
  try {
    let tab, submitFunc;
    
    // Determine which service to use
    if (service === 'ideogram') {
      tab = await findOrCreateIdeogramTab();
      submitFunc = submitPromptToIdeogram;
    } else {
      tab = await findOrCreateMidjourneyTab();
      submitFunc = submitPromptToMidjourney;
    }
    
    for (let i = 0; i < message.prompts.length; i++) {
      const prompt = message.prompts[i];
      console.log(`📤 Submitting prompt ${i + 1}/${message.prompts.length} to ${service}`);
      
      try {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: submitFunc,
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
      
      // Wait for textarea to be ready for next prompt (shorter than fixed delay)
      if (i < message.prompts.length - 1) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            return new Promise((resolve) => {
              const checkReady = () => {
                const textarea = document.querySelector('textarea');
                // Textarea is ready when it's empty or value is back to empty
                if (textarea && textarea.value === '') {
                  resolve();
                } else {
                  setTimeout(checkReady, 200); // Check every 200ms
                }
              };
              // Start checking after 1 second
              setTimeout(checkReady, 1000);
            });
          }
        });
      }
    }
    
    // Send batch result
    console.log('✅ Batch complete, sending result...');
    const sent = send({
      type: 'batch_result',
      messageId: message.messageId,
      success: true,
      results,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length
    });
    console.log('📤 Batch result sent:', sent);
    
  } catch (error) {
    console.error('❌ Error submitting batch:', error);
    const sent = send({
      type: 'batch_result',
      messageId: message.messageId,
      success: false,
      error: error.message,
      results
    });
    console.log('📤 Error result sent:', sent);
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

async function findOrCreateIdeogramTab() {
  // Try to find existing Ideogram tab
  const tabs = await chrome.tabs.query({ url: 'https://ideogram.ai/*' });
  
  if (tabs.length > 0) {
    // Activate existing tab
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
    return tabs[0];
  }
  
  // Create new tab
  const tab = await chrome.tabs.create({
    url: 'https://ideogram.ai/t/explore',
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
    console.log('🔍 Looking for prompt input on Midjourney...');
    
    // Clean the prompt - remove /imagine prompt: prefix (not needed for web UI)
    let cleanPrompt = prompt.replace(/^\/imagine\s+prompt:\s*/i, '').trim();
    console.log('🧹 Cleaned prompt:', cleanPrompt.substring(0, 50) + '...');
    
    // Find the prompt input textarea - try multiple selectors
    let textarea = document.querySelector('textarea[placeholder*="prompt"]');
    if (!textarea) textarea = document.querySelector('textarea[data-testid="prompt-input"]');
    if (!textarea) textarea = document.querySelector('.prompt-input textarea');
    if (!textarea) textarea = document.querySelector('textarea');
    
    console.log('🔍 Found textarea:', textarea);
    
    if (!textarea) {
      const allTextareas = document.querySelectorAll('textarea');
      console.log('❌ No textarea found. Total textareas on page:', allTextareas.length);
      return { success: false, error: `Prompt input not found. Found ${allTextareas.length} textareas total.` };
    }
    
    // Set the prompt value
    console.log('✏️ Setting prompt value...');
    textarea.value = cleanPrompt;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Prompt set to:', prompt.substring(0, 50) + '...');
    
    // Find and click submit button
    let submitButton = document.querySelector('button[type="submit"]');
    if (!submitButton) submitButton = document.querySelector('button[aria-label*="Submit"]');
    if (!submitButton) submitButton = document.querySelector('.submit-button');
    
    console.log('🔍 Found submit button:', submitButton);
    
    if (submitButton) {
      console.log('🖱️ Clicking submit button...');
      submitButton.click();
      return { success: true };
    } else {
      // Fallback: Try Enter key
      console.log('⌨️ No button found, trying Enter key...');
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

/**
 * This function runs IN the Ideogram page context
 * Note: This is injected code, not background script
 */
function submitPromptToIdeogram(prompt) {
  try {
    console.log('🎨 Looking for prompt input on Ideogram...');
    
    // Ideogram uses textarea in their generation interface
    // Find the prompt input - try multiple selectors specific to Ideogram
    let textarea = document.querySelector('textarea[placeholder*="Describe"]');
    if (!textarea) textarea = document.querySelector('textarea[placeholder*="describe"]');
    if (!textarea) textarea = document.querySelector('textarea[placeholder*="prompt"]');
    if (!textarea) textarea = document.querySelector('textarea[name="prompt"]');
    if (!textarea) textarea = document.querySelector('#prompt-input');
    if (!textarea) textarea = document.querySelector('textarea');
    
    console.log('🔍 Found textarea:', textarea);
    
    if (!textarea) {
      const allTextareas = document.querySelectorAll('textarea');
      console.log('❌ No textarea found. Total textareas on page:', allTextareas.length);
      return { success: false, error: `Prompt input not found on Ideogram. Found ${allTextareas.length} textareas total.` };
    }
    
    // Set the prompt value
    console.log('✏️ Setting prompt value...');
    textarea.value = prompt;
    
    // Trigger React's onChange if it exists
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(textarea, prompt);
    
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Prompt set to:', prompt.substring(0, 50) + '...');
    
    // Find and click generate button - Ideogram typically uses a "Generate" button
    let generateButton = document.querySelector('button[aria-label*="Generate"]');
    if (!generateButton) generateButton = document.querySelector('button:has-text("Generate")');
    if (!generateButton) {
      // Try finding button with text content
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim().toLowerCase().includes('generate')) {
          generateButton = btn;
          break;
        }
      }
    }
    if (!generateButton) generateButton = document.querySelector('button[type="submit"]');
    
    console.log('🔍 Found generate button:', generateButton);
    
    if (generateButton) {
      console.log('🖱️ Clicking generate button...');
      generateButton.click();
      return { success: true };
    } else {
      // Fallback: Try Enter key
      console.log('⌨️ No button found, trying Enter key...');
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
