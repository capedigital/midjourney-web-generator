/**
 * Content Script - Runs on AI generation sites
 * Helps with prompt submission and page interaction
 */

console.log('🌉 Prompt Bridge Extension loaded on:', window.location.hostname);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ pong: true, url: window.location.href });
  }
  return true;
});

// Helper: Find prompt input
function findPromptInput() {
  const selectors = [
    'textarea[placeholder*="prompt"]',
    'textarea[placeholder*="Prompt"]',
    'textarea[data-testid="prompt-input"]',
    '.prompt-input textarea',
    'textarea[name="prompt"]',
    '#prompt-input'
  ];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  
  return null;
}

// Helper: Find submit button
function findSubmitButton() {
  const selectors = [
    'button[type="submit"]',
    'button[aria-label*="Submit"]',
    'button[aria-label*="Generate"]',
    '.submit-button',
    'button.primary-button'
  ];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  
  return null;
}

// Debug: Log when inputs are found
setTimeout(() => {
  const input = findPromptInput();
  const button = findSubmitButton();
  
  console.log('🔍 Prompt input found:', !!input);
  console.log('🔍 Submit button found:', !!button);
  
  if (input) {
    console.log('📍 Input selector:', input.tagName.toLowerCase() + (input.className ? '.' + input.className : ''));
  }
  if (button) {
    console.log('📍 Button selector:', button.tagName.toLowerCase() + (button.className ? '.' + button.className : ''));
  }
}, 2000);
