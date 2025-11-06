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
  if (!authToken) {
    return;
  }

  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  try {
    ws = new WebSocket('ws://127.0.0.1:3001');

    ws.onopen = () => {
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
      
      // Don't reconnect on authentication failure (4002)
      if (event.code === 4002) {
        reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Stop trying
        chrome.action.setBadgeText({ text: '!' });
        return;
      }
      
      // Auto-reconnect for other errors
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(() => connect(), RECONNECT_DELAY);
      }
    };

    ws.onerror = () => {
      // Silent - errors are handled in onclose
    };

  } catch (error) {
    console.error('Failed to create WebSocket:', error);
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
    return false;
  }

  try {
    ws.send(JSON.stringify(message));
    return true;
  } catch (error) {
    return false;
  }
}

async function handleMessage(message) {
  switch (message.type) {
    case 'auth_success':
      authenticated = true;
      
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
    } else if (service === 'firefly') {
      tab = await findOrCreateFireflyTab();
      submitFunc = submitPromptToFirefly;
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
  const results = [];
  const delayMs = message.delayMs || 5000;
  
  try {
    let tab, submitFunc;
    
    // Determine which service to use
    if (service === 'ideogram') {
      tab = await findOrCreateIdeogramTab();
      submitFunc = submitPromptToIdeogram;
    } else if (service === 'firefly') {
      tab = await findOrCreateFireflyTab();
      submitFunc = submitPromptToFirefly;
    } else {
      tab = await findOrCreateMidjourneyTab();
      submitFunc = submitPromptToMidjourney;
    }
    
    for (let i = 0; i < message.prompts.length; i++) {
      const prompt = message.prompts[i];
      
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
        // Frame removed is expected - means page reloaded (Ideogram accepted prompt)
        if (error.message.includes('Frame with ID') || error.message.includes('was removed')) {
          results.push({
            prompt,
            success: true,
            error: null,
            note: 'Page reloaded (likely successful)'
          });
        } else {
          results.push({
            prompt,
            success: false,
            error: error.message
          });
        }
      }
      
      // Wait for UI to be ready for next prompt
      if (i < message.prompts.length - 1) {
        
        // Re-find or refresh tab (in case it reloaded)
        try {
          const tabs = await chrome.tabs.query({ 
            url: service === 'ideogram' ? 'https://ideogram.ai/*' : 'https://www.midjourney.com/*'
          });
          
          if (tabs.length > 0) {
            tab = tabs[0];
          }
        } catch (e) {
          // Silent - will use existing tab
        }
        
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (svc) => {
              return new Promise((resolve) => {
              let checkCount = 0;
              const maxChecks = 30; // 6 seconds max wait (30 * 200ms)
              
              const checkReady = () => {
                checkCount++;
                
                // Find the textarea
                const textarea = document.querySelector('textarea');
                
                if (!textarea) {
                  console.warn('⚠️ Textarea not found during ready check');
                  if (checkCount >= maxChecks) {
                    console.log('⏰ Max wait time reached, continuing anyway');
                    resolve();
                  } else {
                    setTimeout(checkReady, 200);
                  }
                  return;
                }
                
                // Different ready checks for different services
                if (svc === 'ideogram') {
                  // For Ideogram: textarea is ready when it's empty AND not disabled
                  // Also check if a Generate button exists and is enabled
                  const generateBtn = document.querySelector('button.MuiButton-root');
                  const isReady = textarea.value === '' && !textarea.disabled;
                  const btnReady = !generateBtn || !generateBtn.disabled;
                  
                  if (isReady && btnReady) {
                    console.log('✅ Ideogram UI ready for next prompt');
                    resolve();
                  } else {
                    if (checkCount >= maxChecks) {
                      console.log('⏰ Max wait time reached, continuing anyway');
                      resolve();
                    } else {
                      setTimeout(checkReady, 200);
                    }
                  }
                } else {
                  // For Midjourney: textarea is ready when it's empty
                  if (textarea.value === '') {
                    console.log('✅ Midjourney UI ready for next prompt');
                    resolve();
                  } else {
                    if (checkCount >= maxChecks) {
                      console.log('⏰ Max wait time reached, continuing anyway');
                      resolve();
                    } else {
                      setTimeout(checkReady, 200);
                    }
                  }
                }
              };
              
              // Start checking after brief delay to let submission process
              setTimeout(checkReady, 500);
            });
          },
          args: [service]
        });
        
        } catch (readyCheckError) {
          // Continue anyway with a small delay
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
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
    url: 'https://ideogram.ai/t/my-images',
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
    
    // Ideogram responds better to Enter key than button click (like the Electron app does)
    // Wait a moment for React to process the input, then send Enter key
    console.log('⌨️ Submitting with Enter key (300ms delay)...');
    
    setTimeout(() => {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      textarea.dispatchEvent(enterEvent);
      console.log('✅ Enter key dispatched');
    }, 300);
    
    return { success: true, method: 'keyboard' };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function findOrCreateFireflyTab() {
  // Try to find existing Firefly tab
  const tabs = await chrome.tabs.query({ url: 'https://firefly.adobe.com/*' });
  
  if (tabs.length > 0) {
    // Activate existing tab
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
    // Give page a moment to be interactive
    await new Promise(resolve => setTimeout(resolve, 1000));
    return tabs[0];
  }
  
  // Create new tab
  const tab = await chrome.tabs.create({
    url: 'https://firefly.adobe.com/generate/image',
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
  
  // Extra delay for Firefly's heavy JS app to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return tab;
}

/**
 * This function runs IN the Firefly page context
 * Note: This is injected code, not background script
 */
function submitPromptToFirefly(prompt) {
  return new Promise((resolve) => {
    try {
      console.log('🔥 Looking for prompt input on Firefly...');
      
      // Poll for textarea to appear (Firefly loads slowly)
      let attempts = 0;
      const maxAttempts = 20;
      
      const pollForTextarea = setInterval(() => {
        attempts++;
        
        // Find the prompt input
        let textarea = document.querySelector('textarea[placeholder*="Describe"]');
        if (!textarea) textarea = document.querySelector('textarea[placeholder*="describe"]');
        if (!textarea) textarea = document.querySelector('textarea[placeholder*="prompt"]');
        if (!textarea) textarea = document.querySelector('textarea');
        
        if (textarea) {
          clearInterval(pollForTextarea);
          console.log('✅ Found textarea after', attempts, 'attempts');
          
          // Set the prompt value
          console.log('✏️ Setting prompt value...');
          textarea.value = prompt;
          
          // Trigger React's onChange
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          nativeInputValueSetter.call(textarea, prompt);
          
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('✅ Prompt set to:', prompt.substring(0, 50) + '...');
          
          // Wait for button to become enabled, then click
          setTimeout(() => {
            let generateButton = document.querySelector('firefly-image-generation-generate-button');
            
            if (generateButton) {
              console.log('🖱️ Found generate button, clicking...');
              const innerButton = generateButton.querySelector('button');
              if (innerButton && !innerButton.disabled) {
                innerButton.click();
                console.log('✅ Clicked inner button');
                resolve({ success: true, method: 'button' });
              } else if (innerButton) {
                console.log('⚠️ Button still disabled, trying Enter key...');
                const enterEvent = new KeyboardEvent('keydown', {
                  key: 'Enter',
                  code: 'Enter',
                  keyCode: 13,
                  which: 13,
                  bubbles: true
                });
                textarea.dispatchEvent(enterEvent);
                console.log('✅ Enter key dispatched');
                resolve({ success: true, method: 'keyboard' });
              } else {
                generateButton.click();
                console.log('✅ Clicked generate button');
                resolve({ success: true, method: 'button' });
              }
            } else {
              console.log('⌨️ No button found, using Enter key...');
              const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
              });
              textarea.dispatchEvent(enterEvent);
              console.log('✅ Enter key dispatched');
              resolve({ success: true, method: 'keyboard' });
            }
          }, 1000);
          
        } else if (attempts >= maxAttempts) {
          clearInterval(pollForTextarea);
          const allTextareas = document.querySelectorAll('textarea');
          console.log('❌ Textarea not found after', maxAttempts, 'attempts. Total textareas:', allTextareas.length);
          resolve({ success: false, error: `Prompt input not found on Firefly after ${maxAttempts} attempts.` });
        } else {
          console.log('⏳ Waiting for textarea... attempt', attempts);
        }
      }, 500); // Check every 500ms
      
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});
