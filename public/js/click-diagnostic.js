/**
 * Click Diagnostic Tool
 * Run this in browser console to debug why buttons aren't receiving clicks
 */

console.log('🔍 === CLICK DIAGNOSTIC STARTING ===');

// 1. Check if buttons exist
const allMjButtons = document.querySelectorAll('.midjourney-btn');
console.log('🔍 Found', allMjButtons.length, 'Midjourney buttons');

if (allMjButtons.length === 0) {
    console.error('❌ NO MIDJOURNEY BUTTONS FOUND IN DOM!');
} else {
    allMjButtons.forEach((btn, index) => {
        console.log(`🔍 Button ${index + 1}:`, btn);
        
        // Check computed styles
        const computedStyle = window.getComputedStyle(btn);
        console.log(`  - display: ${computedStyle.display}`);
        console.log(`  - visibility: ${computedStyle.visibility}`);
        console.log(`  - pointer-events: ${computedStyle.pointerEvents}`);
        console.log(`  - z-index: ${computedStyle.zIndex}`);
        console.log(`  - position: ${computedStyle.position}`);
        console.log(`  - opacity: ${computedStyle.opacity}`);
        
        // Check if button is actually visible
        const rect = btn.getBoundingClientRect();
        console.log(`  - Position: (${rect.left}, ${rect.top})`);
        console.log(`  - Size: ${rect.width} x ${rect.height}`);
        console.log(`  - Is in viewport: ${rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth}`);
        
        // Check what element is actually at the button's position
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const elementAtPoint = document.elementFromPoint(centerX, centerY);
        
        console.log(`  - Element at button center (${centerX}, ${centerY}):`, elementAtPoint);
        
        if (elementAtPoint !== btn) {
            console.error(`  ❌ BUTTON IS BLOCKED! Element blocking it:`, elementAtPoint);
            console.log(`  - Blocking element class: ${elementAtPoint?.className}`);
            console.log(`  - Blocking element tag: ${elementAtPoint?.tagName}`);
            
            // Check blocking element styles
            if (elementAtPoint) {
                const blockingStyle = window.getComputedStyle(elementAtPoint);
                console.log(`  - Blocking element z-index: ${blockingStyle.zIndex}`);
                console.log(`  - Blocking element pointer-events: ${blockingStyle.pointerEvents}`);
            }
        } else {
            console.log(`  ✅ Button is clickable (element at point matches button)`);
        }
        
        // Check event listeners
        const listeners = getEventListeners(btn);
        console.log(`  - Event listeners:`, listeners);
        
        if (!listeners.click || listeners.click.length === 0) {
            console.error(`  ❌ NO CLICK LISTENERS ATTACHED!`);
        } else {
            console.log(`  ✅ ${listeners.click.length} click listener(s) attached`);
        }
    });
}

// 2. Try to manually attach a test listener
console.log('\n🧪 Attempting to attach test click listener...');
const firstBtn = document.querySelector('.midjourney-btn');
if (firstBtn) {
    firstBtn.addEventListener('click', function testHandler(e) {
        console.log('🎯 TEST CLICK HANDLER FIRED!', e);
        console.log('  - Event target:', e.target);
        console.log('  - Event currentTarget:', e.currentTarget);
        console.log('  - Event phase:', e.eventPhase);
        console.log('  - Event bubbles:', e.bubbles);
        console.log('  - Event cancelable:', e.cancelable);
        console.log('  - Event defaultPrevented:', e.defaultPrevented);
    }, true); // Use capture phase
    
    console.log('✅ Test listener attached. Try clicking the first Midjourney button now.');
    console.log('   If you see "🎯 TEST CLICK HANDLER FIRED!" the button IS clickable.');
    console.log('   If you see nothing, the click is being blocked before reaching the button.');
} else {
    console.error('❌ Could not find first Midjourney button to attach test listener');
}

console.log('\n🔍 === CLICK DIAGNOSTIC COMPLETE ===');
console.log('📋 NEXT STEPS:');
console.log('1. If buttons are blocked by another element, that element needs pointer-events: none');
console.log('2. If no click listeners are attached, check when attachButtonEventListeners() is called');
console.log('3. If test handler fires but regular handler doesn\'t, there\'s an event listener timing issue');
