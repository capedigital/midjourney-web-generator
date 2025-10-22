window.Hooks = {
    init: function() {
        this.setupEventListeners();
        this.initializeEnhancerFields();
    },

    initializeEnhancerFields: function() {
        const enhancerFields = document.querySelectorAll('.enhancer-input');
        enhancerFields.forEach(field => {
            const wrapper = field.closest('.input-wrapper');
            const clearBtn = wrapper?.querySelector('.clear-button');
            
            if (clearBtn) {
                // Show/hide clear button based on content
                field.addEventListener('input', () => {
                    clearBtn.style.display = field.value ? 'block' : 'none';
                });
                
                // Clear button click handler
                clearBtn.addEventListener('click', () => {
                    field.value = '';
                    clearBtn.style.display = 'none';
                    field.focus();
                    field.dispatchEvent(new Event('input'));
                });
                
                // Initial state
                clearBtn.style.display = field.value ? 'block' : 'none';
            }
        });
    },

    setupEventListeners: function() {
        // Listen for enhancer changes - REMOVED to prevent conflict with app.js
        // document.querySelectorAll('.enhancer-input').forEach(input => {
        //     input.addEventListener('input', () => {
        //         this.updateTemplateWithEnhancers();
        //     });
        // });

        // Remove the apply enhancers button handler
        
        // Add default values button handler
        const loadDefaultsBtn = document.getElementById('load-default-enhancers');
        if (loadDefaultsBtn) {
            loadDefaultsBtn.addEventListener('click', () => {
                const defaults = {
                    'style-theme': 'photorealistic, highly detailed',
                    'medium-technique': 'digital art, 8K',
                    'lighting': 'dramatic lighting, volumetric',
                    'color-palette': 'vibrant colors',
                    'mood-tone': 'atmospheric',
                    'composition': 'rule of thirds'
                };

                Object.entries(defaults).forEach(([id, value]) => {
                    const field = document.getElementById(id);
                    if (field) {
                        field.value = value;
                        field.dispatchEvent(new Event('input'));
                    }
                });

                window.Utils.showToast('Default enhancers loaded', 'success');
            });
        }

        // Add prompt count change listener - REMOVED to prevent conflict with app.js
        // const promptCountSelect = document.getElementById('prompt-count');
        // if (promptCountSelect) {
        //     promptCountSelect.addEventListener('change', () => {
        //         this.updateTemplateWithEnhancers();
        //     });
        // }
    },

    // REMOVED the entire updateTemplateWithEnhancers function as it conflicts with app.js
    /*
    updateTemplateWithEnhancers: function() {
        ...
    },
    */

    getCurrentMJParameters: function() {
        const params = [];
        
        // Get values from all parameter selects
        const aspect = document.getElementById('aspect-ratio')?.value;
        const stylize = document.getElementById('stylize-value')?.value;
        const quality = document.getElementById('quality-value')?.value;
        const chaos = document.getElementById('chaos-value')?.value;
        const style = document.getElementById('style-version')?.value;
        const speed = document.getElementById('speed-value')?.value;

        // Add non-empty parameters to array
        if (aspect) params.push(aspect);
        if (stylize) params.push(stylize);
        if (quality) params.push(quality);
        if (chaos) params.push(chaos);
        if (style) params.push(style);
        if (speed) params.push(speed);

        return params.join(' ');
    }
};
