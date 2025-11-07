/**
 * Background Service Worker
 * Manages WebSocket connection to local bridge server
 */

let ws = null;
let connected = false;
let authenticated = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000;
let keepAliveInterval = null;

// Auto-connect on startup (no token needed!)
connect();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    sendResponse({
      connected,
      authenticated
    });
  } else if (message.type === 'RECONNECT') {
    connect();
    sendResponse({ success: true });
  } else if (message.type === 'DISCONNECT') {
    disconnect();
    sendResponse({ success: true });
  }
  return true; // Keep channel open for async response
});

function connect() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  try {
    ws = new WebSocket('ws://127.0.0.1:3001');

    ws.onopen = () => {
      connected = true;
      reconnectAttempts = 0;
      
      // Authenticate with simple extension token
      send({
        type: 'auth',
        token: 'extension-auto-' + Date.now(), // Simple token, just needs to be present
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
  console.log('🔍 Extension received message:', message);
  
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
      console.log('🔥 Handling batch submission for service:', message.service);
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
    } else if (service === 'gemini') {
      tab = await findOrCreateGeminiTab();
      submitFunc = submitPromptToGemini;
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
  
  console.log('🔥 handleSubmitBatch starting for service:', service, 'with', message.prompts.length, 'prompts');
  
  try {
    let tab, submitFunc;
    
    // Determine which service to use
    if (service === 'ideogram') {
      console.log('📱 Using Ideogram service');
      tab = await findOrCreateIdeogramTab();
      submitFunc = submitPromptToIdeogram;
    } else if (service === 'firefly') {
      console.log('🔥 Using Firefly service');
      tab = await findOrCreateFireflyTab();
      submitFunc = submitPromptToFirefly;
    } else if (service === 'gemini') {
      console.log('🔷 Using Gemini service');
      tab = await findOrCreateGeminiTab();
      submitFunc = submitPromptToGemini;
    } else {
      console.log('🎨 Using Midjourney service (default)');
      tab = await findOrCreateMidjourneyTab();
      submitFunc = submitPromptToMidjourney;
    }
    
    console.log('✅ Tab created/found:', tab.id, tab.url);
    
    for (let i = 0; i < message.prompts.length; i++) {
      const prompt = message.prompts[i];
      
      try {
        console.log('💉 Injecting script for prompt', i + 1, ':', prompt.substring(0, 50) + '...');
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: submitFunc,
          args: [prompt]
        });
        
        console.log('📋 Script result:', result);
        
        results.push({
          prompt,
          success: result[0]?.result?.success || false,
          error: result[0]?.result?.error
        });
        
      } catch (error) {
        console.error('❌ Script injection failed:', error);
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
          let queryUrl;
          if (service === 'ideogram') {
            queryUrl = 'https://ideogram.ai/*';
          } else if (service === 'firefly') {
            queryUrl = 'https://firefly.adobe.com/*';
          } else if (service === 'gemini') {
            queryUrl = 'https://aistudio.google.com/*';
          } else {
            queryUrl = 'https://www.midjourney.com/*';
          }
          
          const tabs = await chrome.tabs.query({ url: queryUrl });
          
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
              const maxChecks = svc === 'firefly' ? 150 : 30; // Firefly needs more time (30 seconds) due to image generation
              
              const checkReady = () => {
                checkCount++;
                
                // Log progress every 10 checks for Firefly
                if (svc === 'firefly' && checkCount % 10 === 0) {
                  console.log(`[Firefly Batch] Waiting for UI ready... check ${checkCount}/${maxChecks}`);
                }
                
                // Find the input based on service
                let inputElement = null;
                
                if (svc === 'firefly') {
                  // Firefly uses 5 nested Shadow DOMs:
                  // firefly-image-generation -> firefly-image-generation-prompt-panel -> firefly-prompt -> firefly-textfield -> textarea
                  const fireflyContainer = document.querySelector('firefly-image-generation');
                  if (fireflyContainer && fireflyContainer.shadowRoot) {
                    const promptPanel = fireflyContainer.shadowRoot.querySelector('firefly-image-generation-prompt-panel');
                    if (promptPanel && promptPanel.shadowRoot) {
                      const fireflyPrompt = promptPanel.shadowRoot.querySelector('firefly-prompt');
                      if (fireflyPrompt && fireflyPrompt.shadowRoot) {
                        const fireflyTextField = fireflyPrompt.shadowRoot.querySelector('firefly-textfield#prompt-input') ||
                                                fireflyPrompt.shadowRoot.querySelector('firefly-textfield');
                        if (fireflyTextField && fireflyTextField.shadowRoot) {
                          inputElement = fireflyTextField.shadowRoot.querySelector('textarea');
                        }
                      }
                    }
                  }
                } else {
                  // Other services use textarea
                  inputElement = document.querySelector('textarea');
                }
                
                if (!inputElement) {
                  console.warn('⚠️ Input element not found during ready check for', svc);
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
                  const generateBtn = document.querySelector('button.MuiButton-root');
                  const isReady = inputElement.value === '' && !inputElement.disabled;
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
                } else if (svc === 'firefly') {
                  // For Firefly: check if firefly-textfield is empty AND Generate button is not disabled
                  // Navigate to the Generate button in Shadow DOM
                  const fireflyContainer = document.querySelector('firefly-image-generation');
                  let generateBtn = null;
                  let btnReady = false;
                  
                  if (fireflyContainer && fireflyContainer.shadowRoot) {
                    const promptPanel = fireflyContainer.shadowRoot.querySelector('firefly-image-generation-prompt-panel');
                    if (promptPanel && promptPanel.shadowRoot) {
                      generateBtn = promptPanel.shadowRoot.querySelector('firefly-image-generation-generate-button');
                      
                      // Check if the button component exists and check its state
                      if (generateBtn) {
                        // The button might have a disabled property or attribute
                        const isDisabled = generateBtn.hasAttribute('disabled') || 
                                         generateBtn.getAttribute('aria-disabled') === 'true' ||
                                         generateBtn.disabled === true;
                        
                        // If it has shadow DOM, check the actual button element inside
                        if (generateBtn.shadowRoot) {
                          const actualButton = generateBtn.shadowRoot.querySelector('button');
                          if (actualButton) {
                            btnReady = !actualButton.disabled && !actualButton.hasAttribute('disabled');
                          } else {
                            btnReady = !isDisabled;
                          }
                        } else {
                          btnReady = !isDisabled;
                        }
                        
                        if (checkCount % 10 === 0) {
                          console.log(`[Firefly Batch] Generate button state: ${btnReady ? 'READY' : 'DISABLED'}`);
                        }
                      } else {
                        // If we can't find the button, assume it's ready
                        btnReady = true;
                      }
                    } else {
                      btnReady = true; // Can't check, assume ready
                    }
                  } else {
                    btnReady = true; // Can't check, assume ready
                  }
                  
                  const isReady = (!inputElement.value || inputElement.value === '') && !inputElement.disabled;
                  
                  if (isReady && btnReady) {
                    console.log('✅ Firefly UI ready for next prompt (textarea clear + button enabled)');
                    resolve();
                  } else {
                    if (checkCount >= maxChecks) {
                      console.log('⏰ Max wait time reached for Firefly, continuing anyway');
                      console.log(`   Textarea ready: ${isReady}, Button ready: ${btnReady}`);
                      resolve();
                    } else {
                      setTimeout(checkReady, 200);
                    }
                  }
                } else {
                  // For Midjourney: textarea is ready when it's empty
                  if (inputElement.value === '') {
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
  
  // Wait for Firefly's custom element to actually be in the DOM
  console.log('⏳ Waiting for Firefly UI to initialize...');
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 100; // 20 seconds max
        
        const checkForFirefly = () => {
          attempts++;
          
          // Navigate through 5 Shadow DOM levels:
          // 1. firefly-image-generation (main DOM)
          // 2. firefly-image-generation-prompt-panel (inside #1's shadowRoot)
          // 3. firefly-prompt (inside #2's shadowRoot)
          // 4. firefly-textfield (inside #3's shadowRoot)
          // 5. textarea (inside #4's shadowRoot)
          
          const fireflyContainer = document.querySelector('firefly-image-generation');
          if (!fireflyContainer || !fireflyContainer.shadowRoot) {
            if (attempts >= maxAttempts) {
              console.log(`❌ Firefly container not ready after ${attempts} checks`);
              resolve(false);
              return;
            }
            setTimeout(checkForFirefly, 200);
            return;
          }
          
          const promptPanel = fireflyContainer.shadowRoot.querySelector('firefly-image-generation-prompt-panel');
          if (!promptPanel || !promptPanel.shadowRoot) {
            if (attempts >= maxAttempts) {
              console.log(`❌ Prompt panel not ready after ${attempts} checks`);
              resolve(false);
              return;
            }
            setTimeout(checkForFirefly, 200);
            return;
          }
          
          const fireflyPrompt = promptPanel.shadowRoot.querySelector('firefly-prompt');
          if (!fireflyPrompt || !fireflyPrompt.shadowRoot) {
            if (attempts >= maxAttempts) {
              console.log(`❌ Firefly prompt not ready after ${attempts} checks`);
              resolve(false);
              return;
            }
            setTimeout(checkForFirefly, 200);
            return;
          }
          
          const fireflyElement = fireflyPrompt.shadowRoot.querySelector('firefly-textfield');
          if (!fireflyElement || !fireflyElement.shadowRoot) {
            if (attempts >= maxAttempts) {
              console.log(`❌ Textfield not ready after ${attempts} checks`);
              resolve(false);
              return;
            }
            setTimeout(checkForFirefly, 200);
            return;
          }
          
          const textarea = fireflyElement.shadowRoot.querySelector('textarea');
          if (textarea) {
            console.log(`✅ Firefly ready after ${attempts} checks`);
            resolve(true);
          } else {
            if (attempts >= maxAttempts) {
              console.log(`❌ Textarea not ready after ${attempts} checks`);
              resolve(false);
              return;
            }
            setTimeout(checkForFirefly, 200);
          }
        };
        
        checkForFirefly();
      });
    }
  });
  
  return tab;
}

/**
 * This function runs IN the Firefly page context
 * Note: This is injected code, not background script
 */
function submitPromptToFirefly(prompt) {
  return new Promise((resolve) => {
    console.log('🔥 Looking for prompt input on Firefly...');
    
    let attempts = 0;
    const maxAttempts = 150;
    
    const waitForElement = () => {
      attempts++;
      
      if (attempts % 10 === 0) {
        console.log(`[Firefly] Attempt ${attempts}/${maxAttempts}: Looking for prompt panel...`);
        
        // On attempt 10, dump diagnostic info
        if (attempts === 10) {
          const allElements = document.querySelectorAll('*');
          const customElements = Array.from(allElements).filter(el => el.tagName.includes('-'));
          const fireflyElements = customElements.filter(el => el.tagName.toLowerCase().includes('firefly'));
          
          console.log(`[Firefly] Total elements: ${allElements.length}`);
          console.log(`[Firefly] Custom elements: ${customElements.length}`);
          console.log(`[Firefly] Firefly elements: ${fireflyElements.length}`, fireflyElements.map(el => el.tagName));
          console.log(`[Firefly] Textareas on page: ${document.querySelectorAll('textarea').length}`);
          
          // Check the firefly-image-generation container
          const fireflyContainer = document.querySelector('firefly-image-generation');
          if (fireflyContainer) {
            console.log(`[Firefly] Found firefly-image-generation!`);
            console.log(`[Firefly] Has shadowRoot: ${!!fireflyContainer.shadowRoot}`);
            if (fireflyContainer.shadowRoot) {
              const shadowChildren = Array.from(fireflyContainer.shadowRoot.querySelectorAll('*'))
                .filter(el => el.tagName.includes('-'))
                .map(el => el.tagName);
              console.log(`[Firefly] Shadow DOM children (${shadowChildren.length}):`, shadowChildren);
              
              // Check specifically for the prompt panel
              const promptPanel = fireflyContainer.shadowRoot.querySelector('firefly-image-generation-prompt-panel');
              console.log(`[Firefly] Looking for firefly-image-generation-prompt-panel:`, !!promptPanel);
              if (promptPanel) {
                console.log(`[Firefly] Prompt panel has shadowRoot:`, !!promptPanel.shadowRoot);
                if (promptPanel.shadowRoot) {
                  const promptPanelChildren = Array.from(promptPanel.shadowRoot.querySelectorAll('*'))
                    .filter(el => el.tagName.includes('-'))
                    .map(el => el.tagName);
                  console.log(`[Firefly] Prompt panel shadow children (${promptPanelChildren.length}):`, promptPanelChildren);
                }
              }
            }
          } else {
            console.log(`[Firefly] firefly-image-generation NOT FOUND!`);
          }
          
          // Check if we're in the right context
          console.log(`[Firefly] Document URL: ${document.location.href}`);
          console.log(`[Firefly] Document title: ${document.title}`);
        }
      }
      
      // LAYER 1: First find the main firefly-image-generation container (in main DOM)
      const fireflyContainer = document.querySelector('firefly-image-generation');
      
      if (!fireflyContainer) {
        if (attempts >= maxAttempts) {
          console.log('[Firefly] ERROR: firefly-image-generation not found after all attempts');
          resolve({ success: false, error: 'Firefly container not found' });
          return;
        }
        setTimeout(waitForElement, 200);
        return;
      }
      
      // LAYER 2: Navigate into its shadow DOM to find the prompt panel
      if (!fireflyContainer.shadowRoot) {
        if (attempts >= maxAttempts) {
          console.log('[Firefly] ERROR: firefly-image-generation shadowRoot not initialized');
          resolve({ success: false, error: 'Firefly container shadow DOM not ready' });
          return;
        }
        setTimeout(waitForElement, 200);
        return;
      }
      
      const promptPanel = fireflyContainer.shadowRoot.querySelector('firefly-image-generation-prompt-panel');
      
      if (!promptPanel) {
        if (attempts >= maxAttempts) {
          console.log('[Firefly] ERROR: firefly-image-generation-prompt-panel not found in container shadow DOM');
          resolve({ success: false, error: 'Prompt panel not found in shadow DOM' });
          return;
        }
        setTimeout(waitForElement, 200);
        return;
      }
      
      // LAYER 3: The prompt panel has its own Shadow DOM with firefly-prompt-container inside
      if (!promptPanel.shadowRoot) {
        if (attempts >= maxAttempts) {
          console.log('[Firefly] ERROR: Prompt panel shadowRoot not initialized');
          resolve({ success: false, error: 'Prompt panel shadow DOM not ready' });
          return;
        }
        setTimeout(waitForElement, 200);
        return;
      }
      
      // LAYER 4: Look for FIREFLY-PROMPT inside the prompt panel's shadow DOM  
      const fireflyPrompt = promptPanel.shadowRoot.querySelector('firefly-prompt');
      
      if (!fireflyPrompt) {
        if (attempts >= maxAttempts) {
          console.log('[Firefly] ERROR: firefly-prompt not found in prompt panel shadow DOM');
          resolve({ success: false, error: 'Firefly prompt element not found' });
          return;
        }
        setTimeout(waitForElement, 200);
        return;
      }
      
      // LAYER 5: firefly-prompt also has Shadow DOM with firefly-textfield inside
      if (!fireflyPrompt.shadowRoot) {
        if (attempts >= maxAttempts) {
          console.log('[Firefly] ERROR: Firefly prompt shadowRoot not initialized');
          resolve({ success: false, error: 'Firefly prompt shadow DOM not ready' });
          return;
        }
        setTimeout(waitForElement, 200);
        return;
      }
      
      // Now find firefly-textfield inside the firefly-prompt's shadow DOM
      const fireflyTextField = fireflyPrompt.shadowRoot.querySelector('firefly-textfield#prompt-input') ||
                               fireflyPrompt.shadowRoot.querySelector('firefly-textfield');
      
      if (!fireflyTextField) {
        if (attempts >= maxAttempts) {
          console.log('❌ firefly-textfield not found in container shadow DOM');
          resolve({ success: false, error: 'Firefly textfield not found' });
          return;
        }
        setTimeout(waitForElement, 200);
        return;
      }
      
      // firefly-textfield ALSO has Shadow DOM with the actual textarea
      if (!fireflyTextField.shadowRoot) {
        if (attempts >= maxAttempts) {
          console.log('❌ Textfield shadowRoot not initialized');
          resolve({ success: false, error: 'Textfield shadow DOM not ready' });
          return;
        }
        setTimeout(waitForElement, 200);
        return;
      }
      
      // Finally, get the textarea from inside the textfield's shadow DOM
      const textarea = fireflyTextField.shadowRoot.querySelector('textarea');
      
      if (!textarea) {
        if (attempts >= maxAttempts) {
          console.log('❌ textarea not found in textfield shadow DOM');
          resolve({ success: false, error: 'Textarea not found' });
          return;
        }
        setTimeout(waitForElement, 200);
        return;
      }
      
      // Success! We found the textarea through 4 levels of Shadow DOM
      console.log(`✅ Found textarea after ${attempts} attempts (through 4 Shadow DOM levels)`);
      
      try {
        // Focus the textarea first (many modern apps require focus before accepting input)
        textarea.focus();
        textarea.click(); // Some apps also need a click event
        
        // Small delay to ensure focus is registered, then set value
        setTimeout(() => {
          // Clear any existing value
          textarea.value = '';
          
          // Set the new value
          textarea.value = prompt;
          
          // Trigger all relevant events to ensure the app detects the change
          const inputEvent = new Event('input', { bubbles: true, composed: true });
          const changeEvent = new Event('change', { bubbles: true, composed: true });
          const keyupEvent = new KeyboardEvent('keyup', { bubbles: true, composed: true });
          
          textarea.dispatchEvent(inputEvent);
          textarea.dispatchEvent(changeEvent);
          textarea.dispatchEvent(keyupEvent);
          
          console.log('✅ Prompt set and events dispatched:', prompt.substring(0, 50) + '...');
        }, 100);
        
        // Find Generate button (likely in the main DOM or prompt panel shadow DOM)
        let generateBtn = document.querySelector('button[type="submit"]');
        if (!generateBtn && promptPanel.shadowRoot) {
          generateBtn = promptPanel.shadowRoot.querySelector('button[type="submit"]');
        }
        if (!generateBtn) {
          const buttons = Array.from(document.querySelectorAll('button'));
          generateBtn = buttons.find(btn => btn.textContent.includes('Generate'));
        }
        
        if (generateBtn && !generateBtn.disabled) {
          setTimeout(() => {
            generateBtn.click();
            console.log('✅ Generate button clicked');
          }, 300);
          resolve({ success: true, method: 'button' });
        } else {
          // Fallback to Enter key
          setTimeout(() => {
            textarea.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              bubbles: true,
              composed: true
            }));
            console.log('✅ Enter key sent');
          }, 300);
          resolve({ success: true, method: 'keyboard' });
        }
      } catch (error) {
        console.error('❌ Error:', error);
        resolve({ success: false, error: error.message });
      }
    };
    
    waitForElement();
  });
}

async function findOrCreateGeminiTab() {
  // Try to find existing Gemini tab
  const tabs = await chrome.tabs.query({ url: 'https://aistudio.google.com/*' });
  
  if (tabs.length > 0) {
    // Activate existing tab
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
    return tabs[0];
  }
  
  // Create new tab
  const tab = await chrome.tabs.create({
    url: 'https://aistudio.google.com/prompts/new_chat?model=gemini-2.5-flash-image',
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

function submitPromptToGemini(prompt) {
  try {
    console.log('🔷 Looking for prompt input on Gemini AI Studio...');
    
    // Find the prompt input - try multiple selectors
    let textarea = document.querySelector('textarea[placeholder*="Enter a prompt"]');
    if (!textarea) textarea = document.querySelector('textarea[placeholder*="prompt"]');
    if (!textarea) textarea = document.querySelector('textarea[aria-label*="prompt"]');
    if (!textarea) textarea = document.querySelector('textarea');
    
    console.log('🔍 Found textarea:', textarea);
    
    if (!textarea) {
      const allTextareas = document.querySelectorAll('textarea');
      console.log('❌ No textarea found. Total textareas on page:', allTextareas.length);
      return { success: false, error: `Prompt input not found on Gemini. Found ${allTextareas.length} textareas total.` };
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
    
    // Submit with Enter key (like Ideogram)
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
    console.error('❌ Error in submitPromptToGemini:', error);
    return { success: false, error: error.message };
  }
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});
