// DIAGNOSTIC TOOL - Only runs in development mode
if (window.logger && window.logger.isDebugMode()) {
  logger.debug('=== DIAGNOSTIC TOOL STARTING ===');

  // Test 1: Check if core objects are defined
  logger.debug('\n1. CORE OBJECTS CHECK:');
  const coreObjects = ['Generator', 'MidjourneyHandler', 'Hooks', 'ipcRenderer'];
  coreObjects.forEach(obj => {
    logger.debug(`${obj}: ${typeof window[obj]} ${window[obj] ? '✅' : '❌'}`);
  });

  // Test 2: Check if critical functions exist
  logger.debug('\n2. CRITICAL FUNCTIONS CHECK:');
  const criticalFunctions = [
    'addRecentPrompt',
    'getCurrentBrowserMode', 
    'sendPromptWithGlobalSetting',
    'getBrowserMode'
  ];
  criticalFunctions.forEach(func => {
    logger.debug(`${func}: ${typeof window[func]} ${window[func] ? '✅' : '❌'}`);
  });

  // Test 3: Check DOM elements
  logger.debug('\n3. CRITICAL DOM ELEMENTS CHECK:');
  const criticalElements = [
    'prompt-container',
    'browser-internal',
    'browser-external',
    'generatedPrompts'
  ];
  criticalElements.forEach(id => {
    const el = document.getElementById(id);
    logger.debug(`#${id}: ${el ? '✅' : '❌'}`);
  });

  // Test 4: Test button handlers
  logger.debug('\n4. BUTTON HANDLERS CHECK:');
  setTimeout(() => {
    const buttons = {
      'ideogram-btn': document.querySelectorAll('.ideogram-btn'),
      'midjourney-btn': document.querySelectorAll('.midjourney-btn'),
      'copy-prompt': document.querySelectorAll('.copy-prompt')
    };
    
    Object.keys(buttons).forEach(className => {
      logger.debug(`${className}: ${buttons[className].length} found`);
    });
  }, 1000);

  // Test 5: Check for errors in console
  logger.debug('\n5. ERROR MONITORING ACTIVE');
  window.addEventListener('error', (e) => {
    logger.error('🚨 ERROR DETECTED:', e.message, 'at', e.filename + ':' + e.lineno);
  });

  logger.debug('\n=== DIAGNOSTIC TOOL COMPLETE ===');
}
