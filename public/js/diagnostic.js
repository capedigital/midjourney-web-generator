console.log('=== DIAGNOSTIC TOOL STARTING ===');

// Test 1: Check if core objects are defined
console.log('\n1. CORE OBJECTS CHECK:');
const coreObjects = ['Generator', 'MidjourneyHandler', 'Hooks', 'ipcRenderer'];
coreObjects.forEach(obj => {
  console.log(`${obj}: ${typeof window[obj]} ${window[obj] ? '✅' : '❌'}`);
});

// Test 2: Check if critical functions exist
console.log('\n2. CRITICAL FUNCTIONS CHECK:');
const criticalFunctions = [
  'addRecentPrompt',
  'getCurrentBrowserMode', 
  'sendPromptWithGlobalSetting',
  'getBrowserMode'
];
criticalFunctions.forEach(func => {
  console.log(`${func}: ${typeof window[func]} ${window[func] ? '✅' : '❌'}`);
});

// Test 3: Check DOM elements
console.log('\n3. CRITICAL DOM ELEMENTS CHECK:');
const criticalElements = [
  'prompt-container',
  'browser-internal',
  'browser-external',
  'generatedPrompts'
];
criticalElements.forEach(id => {
  const el = document.getElementById(id);
  console.log(`#${id}: ${el ? '✅' : '❌'}`);
});

// Test 4: Test button handlers
console.log('\n4. BUTTON HANDLERS CHECK:');
setTimeout(() => {
  const buttons = {
    'ideogram-btn': document.querySelectorAll('.ideogram-btn'),
    'midjourney-btn': document.querySelectorAll('.midjourney-btn'),
    'copy-prompt': document.querySelectorAll('.copy-prompt')
  };
  
  Object.keys(buttons).forEach(className => {
    console.log(`${className}: ${buttons[className].length} found`);
  });
}, 1000);

// Test 5: Check for errors in console
console.log('\n5. ERROR MONITORING ACTIVE');
window.addEventListener('error', (e) => {
  console.log('🚨 ERROR DETECTED:', e.message, 'at', e.filename + ':' + e.lineno);
});

console.log('\n=== DIAGNOSTIC TOOL COMPLETE ===');
