window.Config = {
    // API Keys - DO NOT HARDCODE! Use backend proxy instead
    OPENROUTER_API_KEY: '', // Removed for security - handled by backend
    
// Default parameters - SINGLE SOURCE OF TRUTH
defaultMJParams: {
    aspect: "4:3",   // Default aspect ratio - you can change to "1:1", "16:9", "9:16", etc.
    stylize: "200",  // Default stylize value - you can change to "100", "500", "750", "1000"
    speed: "relax",  // Default speed value - you can change to "turbo", "fast", "relax"
    chaos: "25",     // Default chaos value - you can change to "0", "50", "75", "100"
    weird: "0",      // Default weird value (none) - typically keep at "0"
    version: "raw"   // Default style version - you can change to "standard"
  },

  // Convert config values to UI dropdown values
  getUIDefaults: function() {
    return {
      'aspect-ratio': `--ar ${this.defaultMJParams.aspect}`,
      'stylize-value': `--stylize ${this.defaultMJParams.stylize}`,
      'chaos-value': this.defaultMJParams.chaos === '0' ? '' : `--c ${this.defaultMJParams.chaos}`,
      'speed-value': `--${this.defaultMJParams.speed}`,
      'style-version': `--style ${this.defaultMJParams.version}`,
      'mode-value': '--draft',
      'version-value': '--v 7'
    };
  },
  
  // Template formulas - updated with new field names 
  templateFormulas: {
    "general-conceptual": "{ContentBlock}; {StyleTheme}, {Medium/Technique}; palette {Color Palette}; {Lighting}; {Composition}; {Environment/Setting}; mood {Mood/Tone}; {WhitespaceHint}; in the style of {Artist References}.",
    "product-ad-general": "{ContentBlock} with the product clear; {StyleTheme}, {Medium/Technique}; palette {Color Palette}; {Lighting}; {Composition}; {Environment/Setting}; mood {Mood/Tone}; {WhitespaceHint}; in the style of {Artist References}.",
    "product-ad-email": "{ContentBlock} shown clearly at small size, open space for copy; {StyleTheme}, {Medium/Technique}; palette {Color Palette}; {Lighting}; {Composition} that reads fast; {Environment/Setting}; mood {Mood/Tone}; {WhitespaceHint}; format: wide email header; in the style of {Artist References}.",
    "educational-concept": "{ContentBlock} that supports learning; {StyleTheme}, {Medium/Technique}; palette {Color Palette}; {Lighting}; {Composition}; {Environment/Setting}; mood {Mood/Tone}; {WhitespaceHint}; in the style of {Artist References}.",
    "social-media-post": "{ContentBlock}; mobile-friendly framing; {StyleTheme}, {Medium/Technique}; palette {Color Palette}; {Lighting}; {Composition}; {Environment/Setting}; mood {Mood/Tone}; {WhitespaceHint}; in the style of {Artist References}.",
    "character-driven": "{ContentBlock} (character centered); {StyleTheme}, {Medium/Technique}; palette {Color Palette}; {Lighting}; {Composition}; {Environment/Setting}; mood {Mood/Tone}; {WhitespaceHint}; in the style of {Artist References}.",
    "minimalist": "{ContentBlock} reduced to essentials; subtle {Color Palette}; simple {Lighting}; sparse {Composition}; clean {Environment/Setting}; mood {Mood/Tone}; {WhitespaceHint}; {StyleTheme}, {Medium/Technique}; in the style of {Artist References}.",
    "infographic-style": "{ContentBlock} with clear data shapes; {StyleTheme}, {Medium/Technique}; palette {Color Palette}; readable {Lighting}; clean {Composition}; {Environment/Setting}; mood {Mood/Tone}; {WhitespaceHint}; in the style of {Artist References}.",
    "holiday-campaign": "{ContentBlock} with seasonal cues; {StyleTheme}, {Medium/Technique}; palette {Color Palette}; {Lighting}; {Composition}; {Environment/Setting}; mood {Mood/Tone}; {WhitespaceHint}; in the style of {Artist References}.",
    "hero-banner-web": "{ContentBlock}; instant impact across full width; {StyleTheme}, {Medium/Technique}; palette {Color Palette}; {Lighting}; {Composition}; {Environment/Setting}; mood {Mood/Tone}; {WhitespaceHint}; in the style of {Artist References}.",
    "hero-image-email": "{ContentBlock}; legible at small scale with copy space; {StyleTheme}, {Medium/Technique}; palette {Color Palette}; {Lighting}; {Composition}; {Environment/Setting}; mood {Mood/Tone}; {WhitespaceHint}; format: email header image; in the style of {Artist References}.",
    "marketing-campaign": "{ContentBlock}; consistent look across pieces; {StyleTheme}, {Medium/Technique}; palette {Color Palette}; {Lighting}; {Composition}; {Environment/Setting}; mood {Mood/Tone}; {WhitespaceHint}; in the style of {Artist References}.",
    "text-generation": "{Subject/Focus}. TEXT ONLY. Pure typography. Solid or transparent background. No icons, images, textures, lines, or effects. {StyleTheme}; palette {Color Palette}; {Composition}; mood {Mood/Tone}; {WhitespaceHint}; inspired by {Artist References}. IMPORTANT: 100% text-only."
  },
  
    // Enhancer field definitions
    enhancerFields: [
        'content-block',
        'style-theme',
        'medium-technique',
        'color-palette',
        'mood-tone',
        'environment-setting',
        'lighting',
        'composition',
        'artist-references',
        'whitespace-hint'
    ],

    getDefaultAIPrompt: function(count = 5, templateType = "") {
        const selectedTemplate = this.templateFormulas[templateType] || this.templateFormulas['general-conceptual'];

        return `Write ${count} unique MidJourney V7 prompts using this template:

"${selectedTemplate}"

CRITICAL RULES:
- Replace every placeholder with 2–8 vivid words (or a tight clause for {ContentBlock}).
- Expand weak inputs with concrete visual detail (materials, texture, era, camera/medium cues).
- Start with the visual subject. Put whitespace/format notes near the end.
- Output PLAIN TEXT ONLY - no "/imagine", no "prompt:", no quotes, no parameters
- DO NOT include: --ar, --v, --style, --stylize, --c, --relax, --draft, or ANY dashes
- Parameters will be added automatically later
- Output exactly ${count} prompts, one per line
- No numbering (1., 2., etc.), no bullets, no extra commentary
- Keep each prompt under ~70 words

Example output format:
A vibrant garden overflowing with colorful wildflowers; palette lush greens and sunny yellows; soft morning light
A vintage steam locomotive chugging through a mountain pass; nostalgic sepia-toned digital illustration
A breathtaking mountain range silhouetted at sunset; minimalist modern graphic design`;
    },

    updateAIPromptWithEnhancers: function() {
        const aiPrompt = document.getElementById('ai-prompt');
        if (!aiPrompt) {
            console.warn('AI prompt textarea not found');
            return;
        }
        
        const enhancerFields = [
            'content-block', 'style-theme', 'medium-technique', 'color-palette', 
            'mood-tone', 'environment-setting', 'lighting', 
            'composition', 'artist-references', 'whitespace-hint'
        ];
        
        const enhancerValues = {};
        let hasAnyValue = false;
        
        const getFieldSeparatorMode = (fieldId) => {
            if (window.EnhancerTags && window.EnhancerTags.fieldSeparatorModes) {
                return window.EnhancerTags.fieldSeparatorModes[fieldId] || 'comma';
            }
            return 'comma';
        };
        
        enhancerFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && field.value.trim()) {
                const useBraceMode = getFieldSeparatorMode(fieldId) === 'brace';
                
                if (useBraceMode) {
                    let fieldValue = field.value.trim();
                    
                    if (window.Utils && typeof window.Utils.toggleTextFormat === 'function') {
                        enhancerValues[fieldId] = window.Utils.toggleTextFormat(fieldValue, 'brace');
                    } else {
                        if (!/^\{.+,.+\}$/.test(fieldValue)) {
                            fieldValue = `{ ${fieldValue} }`;
                        }
                        enhancerValues[fieldId] = fieldValue;
                    }
                } else {
                    enhancerValues[fieldId] = field.value.trim();
                }
                
                hasAnyValue = true;
            }
        });
        
        if (!hasAnyValue) {
            aiPrompt.value = "";
            return;
        }
        
        const basePrompt = aiPrompt.value.trim();
        const baseParts = basePrompt.split(/(?:\r?\n)+/);
        const currentPrompt = baseParts[0].trim();
        
        let enhancerString = "\n\nI want you to generate concepts with the following style characteristics:\n";
        
        if (enhancerValues['content-block']) {
            enhancerString += `- Content Block: ${enhancerValues['content-block']}\n`;
        }
        if (enhancerValues['style-theme']) {
            enhancerString += `- Style/Theme: ${enhancerValues['style-theme']}\n`;
        }
        if (enhancerValues['medium-technique']) {
            enhancerString += `- Medium/Technique: ${enhancerValues['medium-technique']}\n`;
        }
        if (enhancerValues['color-palette']) {
            enhancerString += `- Color Palette: ${enhancerValues['color-palette']}\n`;
        }
        if (enhancerValues['mood-tone']) {
            enhancerString += `- Mood/Tone: ${enhancerValues['mood-tone']}\n`;
        }
        if (enhancerValues['environment-setting']) {
            enhancerString += `- Environment/Setting: ${enhancerValues['environment-setting']}\n`;
        }
        if (enhancerValues['lighting']) {
            enhancerString += `- Lighting: ${enhancerValues['lighting']}\n`;
        }
        if (enhancerValues['composition']) {
            enhancerString += `- Composition: ${enhancerValues['composition']}\n`;
        }
        if (enhancerValues['artist-references']) {
            enhancerString += `- Artist References: ${enhancerValues['artist-references']}\n`;
        }
        if (enhancerValues['whitespace-hint']) {
            enhancerString += `- Whitespace Hint: ${enhancerValues['whitespace-hint']}\n`;
        }
        
        const newPrompt = `${currentPrompt}${enhancerString}`;
        aiPrompt.value = newPrompt.trim();
    }
};
