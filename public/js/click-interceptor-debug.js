/**
 * Click Interceptor Debugger
 * This will capture ALL clicks on the page and tell us what's being clicked
 */

console.log('🔍 Click Interceptor Debugger loaded');

// Log EVERY SINGLE CLICK to see what's actually being clicked
document.addEventListener('click', function(e) {
    console.log('🖱️ CLICK DETECTED:', {
        target: e.target,
        tagName: e.target.tagName,
        className: e.target.className,
        id: e.target.id,
        closest_prompt_item: e.target.closest('.prompt-item'),
        closest_button: e.target.closest('button')
    });
}, true);

// Capture ALL clicks at the document level during capture phase (fires FIRST)
document.addEventListener('click', function(e) {
    const target = e.target;
    const isMidjourneyButton = target.classList.contains('midjourney-btn') || 
                               target.classList.contains('send-midjourney') ||
                               target.closest('.midjourney-btn') ||
                               target.closest('.send-midjourney');
    
    if (isMidjourneyButton) {
        console.log('🎯🎯🎯 CLICK DETECTED ON MIDJOURNEY BUTTON (CAPTURE PHASE)');
        console.log('  - Target:', target);
        console.log('  - Target tagName:', target.tagName);
        console.log('  - Target className:', target.className);
        console.log('  - Event phase:', e.eventPhase);
        console.log('  - Event bubbles:', e.bubbles);
        console.log('  - Event cancelable:', e.cancelable);
        console.log('  - Event defaultPrevented:', e.defaultPrevented);
        console.log('  - Event propagationStopped:', e.cancelBubble);
    }
}, true); // TRUE = capture phase (fires before bubble phase)

// Also listen in bubble phase (fires AFTER target)
document.addEventListener('click', function(e) {
    const target = e.target;
    const isMidjourneyButton = target.classList.contains('midjourney-btn') || 
                               target.classList.contains('send-midjourney') ||
                               target.closest('.midjourney-btn') ||
                               target.closest('.send-midjourney');
    
    if (isMidjourneyButton) {
        console.log('🎯🎯🎯 CLICK DETECTED ON MIDJOURNEY BUTTON (BUBBLE PHASE)');
        console.log('  - Target:', target);
        console.log('  - Event phase:', e.eventPhase);
    }
}, false); // FALSE = bubble phase

console.log('✅ Click Interceptor Debugger ready - try clicking a Midjourney button');
