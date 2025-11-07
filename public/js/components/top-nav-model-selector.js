/**
 * Top Navigation Model Selector with Expandable Details
 * Displays current model in header, expands to show full selector with credits
 */

class TopNavModelSelector {
  constructor(options = {}) {
    this.options = {
      containerId: options.containerId || 'top-nav-model-selector',
      defaultSort: options.defaultSort || 'price', // 'price' or 'performance'
      showCredits: options.showCredits !== false,
      onModelChange: options.onModelChange || null
    };

    this.currentModel = null;
    this.models = this.getCuratedModels();
    this.currentSort = this.options.defaultSort;
    this.credits = null;
    this.isExpanded = false;

    this.init();
  }

  /**
   * Curated model list from Electron app
   * Manually maintained with current pricing
   */
  getCuratedModels() {
    const models = [
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        displayLabelShort: 'GPT-4o Mini',
        provider: 'OpenAI',
        priceLabel: '$0.375/M',
        promptPrice: 0.15,
        completionPrice: 0.60,
        promptPriceLabel: 'Prompt: $0.15/M',
        completionPriceLabel: 'Completion: $0.60/M',
        contextLabel: '128k tokens',
        category: 'balanced',
        isDefault: true
      },
      {
        id: 'google/gemini-2.0-flash-001',
        name: 'Gemini 2.0 Flash',
        displayLabelShort: 'Gemini 2.0 Flash',
        provider: 'Google',
        priceLabel: '$0.25/M',
        promptPrice: 0.125,
        completionPrice: 0.50,
        promptPriceLabel: 'Prompt: $0.125/M',
        completionPriceLabel: 'Completion: $0.50/M',
        contextLabel: '1M tokens',
        category: 'budget',
        isFree: true // Has free tier!
      },
      {
        id: 'x-ai/grok-4-fast',
        name: 'Grok 4 Fast',
        displayLabelShort: 'Grok 4 Fast',
        provider: 'X.AI',
        priceLabel: '$2.00/M',
        promptPrice: 1.00,
        completionPrice: 3.00,
        promptPriceLabel: 'Prompt: $1.00/M',
        completionPriceLabel: 'Completion: $3.00/M',
        contextLabel: '128k tokens',
        category: 'premium'
      }
    ];

    // Sort models by price (cheapest first) and by performance
    return {
      price: [...models].sort((a, b) => {
        // Free models first!
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        if (a.isFree && b.isFree) return 0;
        return a.promptPrice - b.promptPrice;
      }),
      performance: [...models].sort((a, b) => {
        // Premium models first, then balanced, then budget, then free
        const order = { premium: 0, balanced: 1, budget: 2, free: 3 };
        return order[a.category] - order[b.category];
      })
    };
  }

  async init() {
    this.container = document.getElementById(this.options.containerId);
    if (!this.container) {
      console.error(`Container #${this.options.containerId} not found`);
      return;
    }

    // Build UI
    this.render();

    // Load user preferences from database
    await this.loadUserPreferences();

    // Render curated model list
    this.renderModelList();

    // Fetch current pricing from OpenRouter and update models
    await this.updateModelPricing();

    // Fetch credits (no need to fetch models - using curated list)
    if (this.options.showCredits) {
      await this.fetchCredits();
    }

    // Setup event listeners
    this.setupEventListeners();

    console.log('🎯 Top Nav Model Selector initialized with', this.models.price.length, 'curated models');
    if (this.currentModel) {
      console.log('✅ Default model selected:', this.currentModel.id);
    }
    console.log('🎨 Target platform:', this.currentPlatform);
  }
  
  /**
   * Load user preferences from database
   */
  async loadUserPreferences() {
    try {
      const response = await fetch('/api/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.preferences) {
          // Set AI model
          const aiModel = data.preferences.aiModel;
          const model = this.models.price.find(m => m.id === aiModel);
          if (model) {
            this.currentModel = model;
            this.updateHeaderDisplay();
            // Sync with global model sync
            if (window.globalModelSync) {
              window.globalModelSync.updateModel(aiModel);
            }
          }
          
          // Set target platform
          this.currentPlatform = data.preferences.targetPlatform || 'midjourney';
          
          // Update platform UI to match loaded preference
          document.querySelectorAll('.platform-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.platform === this.currentPlatform);
          });
          
          // Update collapsed header to show current selections
          this.updateHeaderCollapsedDisplay();
          
          console.log('📥 Loaded preferences from database:', data.preferences);
          return;
        }
      }
      
      // Fallback to defaults if API fails
      console.warn('Could not load preferences, using defaults');
      this.loadSavedModel(); // Use old method as fallback
      this.currentPlatform = 'midjourney';
      
      // Update platform UI
      document.querySelectorAll('.platform-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.platform === 'midjourney');
      });
      
      // Update collapsed header
      this.updateHeaderCollapsedDisplay();
      
    } catch (error) {
      console.error('Error loading preferences:', error);
      this.loadSavedModel();
      this.currentPlatform = 'midjourney';
      
      // Update platform UI
      document.querySelectorAll('.platform-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.platform === 'midjourney');
      });
      
      // Update collapsed header
      this.updateHeaderCollapsedDisplay();
    }
  }

  /**
   * Fetch current pricing from OpenRouter API and update our curated models
   */
  async updateModelPricing() {
    try {
      const response = await fetch('/api/openrouter/models');
      if (!response.ok) {
        console.warn('Could not fetch current pricing, using defaults');
        return;
      }

      const data = await response.json();
      const apiModels = data.data || [];

      // Update pricing for each of our curated models
      ['price', 'performance'].forEach(sortKey => {
        this.models[sortKey] = this.models[sortKey].map(model => {
          const apiModel = apiModels.find(m => m.id === model.id);
          if (apiModel && apiModel.pricing) {
            const promptPrice = parseFloat(apiModel.pricing.prompt) * 1000000;
            const completionPrice = parseFloat(apiModel.pricing.completion) * 1000000;
            
            return {
              ...model,
              promptPrice: promptPrice,
              completionPrice: completionPrice,
              priceLabel: `$${((promptPrice + completionPrice) / 2).toFixed(3)}/M`,
              promptPriceLabel: `Prompt: $${promptPrice.toFixed(3)}/M`,
              completionPriceLabel: `Completion: $${completionPrice.toFixed(3)}/M`,
              contextLabel: apiModel.context_length ? `${(apiModel.context_length / 1000).toFixed(0)}k tokens` : model.contextLabel
            };
          }
          return model;
        });
      });

      // Re-render with updated prices
      this.renderModelList();
      console.log('✅ Model pricing updated from OpenRouter API');
    } catch (error) {
      console.warn('⚠️ Could not update model pricing:', error.message);
      // Continue with default pricing
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="top-nav-model-selector">
        <!-- Collapsed View: Just the robot icon -->
        <div class="model-selector-header" id="model-header">
          <div class="header-text">
            <span class="model-icon"><i class="fas fa-robot"></i></span>
            <div class="header-labels">
              <span class="model-label">AI Config</span>
              <span class="current-selection" id="current-selection">Loading...</span>
            </div>
          </div>
        </div>

        <!-- Expanded View: Invoice-like layout -->
        <div class="model-selector-dropdown" id="model-dropdown" style="display: none;">
          <div class="dropdown-header">
            <h3>AI Configuration</h3>
            <button class="close-btn" id="close-dropdown">✕</button>
          </div>

          <!-- Two Column Layout -->
          <div class="invoice-summary">
            <!-- LEFT COLUMN: OpenRouter Models -->
            <div class="invoice-left">
              <div class="section-label">Current Model</div>
              <div class="current-model-info" id="current-model-info">
                <div class="model-name-large">Loading...</div>
                <div class="model-details-list">
                  <div class="detail-row">
                    <span class="label">Price:</span>
                    <span class="value" id="detail-price">—</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Context:</span>
                    <span class="value" id="detail-context">—</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Model ID:</span>
                    <span class="value mono" id="detail-id">—</span>
                  </div>
                </div>
              </div>
              
              ${this.options.showCredits ? `
                <div style="margin-top: 16px;">
                  <div class="section-label">OpenRouter Credits</div>
                  <div class="credits-info" id="credits-display">
                    <div class="credits-loading">
                      <span class="spinner">⏳</span> Loading...
                    </div>
                  </div>
                </div>
              ` : ''}
              
              <div style="margin-top: 16px;">
                <div class="section-label">Browse Models</div>
              </div>
              
              <div class="model-list" id="model-list">
                <div class="loading">Loading models...</div>
              </div>
            </div>
            
            <!-- RIGHT COLUMN: Target Image Platform -->
            <div class="invoice-right">
              <div class="section-label">Target Image Platform</div>
              <div class="target-platform-list" id="target-platform-list">
                <div class="platform-item selected" data-platform="midjourney">
                  <div class="platform-icon">🎨</div>
                  <div class="platform-info">
                    <div class="platform-name">Midjourney</div>
                    <div class="platform-desc">Artistic, creative imagery</div>
                  </div>
                  <div class="platform-check"><i class="fas fa-check-circle"></i></div>
                </div>
                
                <div class="platform-item" data-platform="ideogram">
                  <div class="platform-icon">📝</div>
                  <div class="platform-info">
                    <div class="platform-name">Ideogram</div>
                    <div class="platform-desc">Text rendering expert</div>
                  </div>
                  <div class="platform-check"><i class="fas fa-check-circle"></i></div>
                </div>
                
                <div class="platform-item" data-platform="firefly">
                  <div class="platform-icon">🔥</div>
                  <div class="platform-info">
                    <div class="platform-name">Adobe Firefly</div>
                    <div class="platform-desc">Commercial-safe prompts</div>
                  </div>
                  <div class="platform-check"><i class="fas fa-check-circle"></i></div>
                </div>
                
                <div class="platform-item" data-platform="gemini">
                  <div class="platform-icon">🔷</div>
                  <div class="platform-info">
                    <div class="platform-name">Google Gemini</div>
                    <div class="platform-desc">Imagen 3 via AI Studio</div>
                  </div>
                  <div class="platform-check"><i class="fas fa-check-circle"></i></div>
                </div>
                
                <div class="platform-item" data-platform="generic">
                  <div class="platform-icon">✨</div>
                  <div class="platform-info">
                    <div class="platform-name">Other / Generic</div>
                    <div class="platform-desc">Grok, Nano Banana, etc.</div>
                  </div>
                  <div class="platform-check"><i class="fas fa-check-circle"></i></div>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Toggle dropdown
    const header = document.getElementById('model-header');
    header.addEventListener('click', () => this.toggleDropdown());

    // Close button
    const closeBtn = document.getElementById('close-dropdown');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeDropdown();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target) && this.isExpanded) {
        this.closeDropdown();
      }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isExpanded) {
        this.closeDropdown();
      }
    });
    
    // Platform selection
    const platformItems = document.querySelectorAll('.platform-item');
    platformItems.forEach(item => {
      item.addEventListener('click', () => {
        const platform = item.dataset.platform;
        this.selectPlatform(platform);
      });
    });
  }

  toggleDropdown() {
    if (this.isExpanded) {
      this.closeDropdown();
    } else {
      this.expandDropdown();
    }
  }

  expandDropdown() {
    const dropdown = document.getElementById('model-dropdown');
    dropdown.style.display = 'block';
    this.isExpanded = true;
    this.container.querySelector('.top-nav-model-selector').classList.add('expanded');
    
    // Refresh credits when opened (models are already curated)
    if (this.options.showCredits) {
      this.fetchCredits();
    }
  }

  closeDropdown() {
    const dropdown = document.getElementById('model-dropdown');
    dropdown.style.display = 'none';
    this.isExpanded = false;
    this.container.querySelector('.top-nav-model-selector').classList.remove('expanded');
  }

  changeSortOrder(sort) {
    this.currentSort = sort;

    // Update active tab
    document.querySelectorAll('.sort-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.sort === sort);
    });

    // Re-render model list
    this.renderModelList();
  }
  
  /**
   * Select a target platform
   */
  async selectPlatform(platform) {
    this.currentPlatform = platform;
    
    // Save to database
    try {
      const response = await fetch('/api/preferences/target-platform', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ platform })
      });
      
      if (response.ok) {
        console.log('💾 Target platform saved to database:', platform);
      } else {
        console.warn('Failed to save target platform to database');
      }
    } catch (error) {
      console.error('Error saving target platform:', error);
    }
    
    // Update UI
    document.querySelectorAll('.platform-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.platform === platform);
    });
    
    // Update collapsed header display
    this.updateHeaderCollapsedDisplay();
    
    // Apply platform-specific changes
    const config = window.Config?.targetModels?.[platform];
    if (config) {
      // Update parameter panel visibility
      const parameterPanel = document.getElementById('mj-parameters');
      if (parameterPanel) {
        if (config.supportsParameters) {
          parameterPanel.style.display = '';
        } else {
          parameterPanel.style.display = 'none';
        }
      }
      
      // Dispatch event for other modules
      window.dispatchEvent(new CustomEvent('target-platform-changed', {
        detail: { platform, config }
      }));
      
      console.log('🎨 Target platform changed:', platform, config);
    }
  }
  
  /**
   * Get current platform
   */
  getCurrentPlatform() {
    if (!this.currentPlatform) {
      this.currentPlatform = localStorage.getItem('target_platform') || 'midjourney';
    }
    return this.currentPlatform;
  }

  async fetchCredits() {
    try {
      const response = await fetch('/api/openrouter/credits');

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.available && data.credits) {
          this.credits = data.credits;
          this.renderCreditsDisplay();
          console.log('💰 Credits updated:', this.credits);
        } else {
          // API returned success but credits not available
          console.log('💳 Credits not available:', data.message || 'No API key configured');
          this.credits = null;
          this.renderCreditsDisplay();
        }
      } else {
        console.warn('Credits endpoint returned error:', response.status);
        this.credits = null;
        this.renderCreditsDisplay();
      }
    } catch (error) {
      console.error('❌ Error fetching credits:', error);
      this.credits = null;
      this.renderCreditsDisplay();
    }
  }

  renderModelList() {
    const modelList = document.getElementById('model-list');
    if (!modelList) return;

    // Always show the 3 curated models from the price array
    const models = this.models.price || [];

    if (models.length === 0) {
      modelList.innerHTML = '<div class="no-models">No models available</div>';
      return;
    }

    modelList.innerHTML = models.map((model, index) => `
      <div class="model-item ${this.currentModel?.id === model.id ? 'selected' : ''}" 
           data-model-id="${model.id}" 
           data-model-index="${index}">
        <div class="model-item-header">
          <div class="model-item-name">
            ${this.escapeHtml(model.displayLabelShort)}
            ${model.isFree ? '<span class="free-badge">🟢 FREE</span>' : ''}
          </div>
          <div class="model-item-price">${model.priceLabel}</div>
        </div>
        <div class="model-item-details">
          <div class="model-detail">
            <span class="detail-label">Context:</span>
            <span class="detail-value">${model.contextLabel}</span>
          </div>
          <div class="model-detail">
            <span class="detail-label">${model.promptPriceLabel}</span>
          </div>
          <div class="model-detail">
            <span class="detail-label">${model.completionPriceLabel}</span>
          </div>
        </div>
        <div class="model-item-footer">
          <span class="model-id">${this.escapeHtml(model.id)}</span>
          ${this.currentModel?.id === model.id ? '<span class="selected-badge">✓ Selected</span>' : ''}
        </div>
      </div>
    `).join('');

    // Add click handlers
    modelList.querySelectorAll('.model-item').forEach(item => {
      item.addEventListener('click', () => {
        const modelId = item.dataset.modelId;
        const modelIndex = parseInt(item.dataset.modelIndex);
        this.selectModel(this.models.price[modelIndex]);
      });
    });
  }

  renderCreditsDisplay() {
    const creditsDisplay = document.getElementById('credits-display');
    if (!creditsDisplay) return;

    if (!this.credits || !this.credits.remaining) {
      creditsDisplay.innerHTML = `
        <div class="credits-unavailable">
          <div class="credit-text-muted">Credit balance unavailable</div>
          <div class="credit-hint">Add OpenRouter API key in settings</div>
        </div>
      `;
      return;
    }

    const remaining = parseFloat(this.credits.remaining);
    const limit = this.credits.limit;
    const usage = parseFloat(this.credits.usage || 0);
    const percentUsed = limit ? (usage / limit * 100).toFixed(1) : 0;

    creditsDisplay.innerHTML = `
      <div class="credits-available">
        <div class="credit-amount-large">${this.credits.formatted.remaining}</div>
        <div class="credit-sublabel">Remaining</div>
        ${limit ? `
          <div class="credit-breakdown-rows">
            <div class="detail-row">
              <span class="label">Credit Limit:</span>
              <span class="value">${this.credits.formatted.limit}</span>
            </div>
            <div class="detail-row">
              <span class="label">Used:</span>
              <span class="value">${this.credits.formatted.usage}</span>
            </div>
            <div class="detail-row">
              <span class="label">Percentage:</span>
              <span class="value">${percentUsed}%</span>
            </div>
          </div>
        ` : ''}
        <div class="credit-updated">Updated: ${new Date().toLocaleTimeString()}</div>
      </div>
    `;
  }

  updateHeaderDisplay() {
    // Update the invoice summary with current model details
    const modelNameLarge = document.querySelector('.model-name-large');
    const detailPrice = document.getElementById('detail-price');
    const detailContext = document.getElementById('detail-context');
    const detailId = document.getElementById('detail-id');

    if (!this.currentModel) {
      if (modelNameLarge) modelNameLarge.textContent = 'No model selected';
      if (detailPrice) detailPrice.textContent = '—';
      if (detailContext) detailContext.textContent = '—';
      if (detailId) detailId.textContent = '—';
      return;
    }

    if (modelNameLarge) modelNameLarge.textContent = this.currentModel.displayLabelShort;
    if (detailPrice) detailPrice.textContent = this.currentModel.priceLabel;
    if (detailContext) detailContext.textContent = this.currentModel.contextLabel || '—';
    if (detailId) detailId.textContent = this.currentModel.id;
    
    // Update collapsed header display
    this.updateHeaderCollapsedDisplay();
  }

  updateHeaderCollapsedDisplay() {
    const currentSelection = document.getElementById('current-selection');
    if (!currentSelection) return;
    
    const modelName = this.currentModel?.displayLabelShort || 'No model';
    const platformName = this.currentPlatform ? 
      this.currentPlatform.charAt(0).toUpperCase() + this.currentPlatform.slice(1) : 
      'No platform';
    
    currentSelection.textContent = `${modelName} / ${platformName}`;
  }

  async selectModel(model) {
    this.currentModel = model;
    
    // Save to database
    try {
      const response = await fetch('/api/preferences/ai-model', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ aiModel: model.id })
      });
      
      if (response.ok) {
        console.log('💾 AI model saved to database:', model.id);
      } else {
        console.warn('Failed to save AI model to database');
      }
    } catch (error) {
      console.error('Error saving AI model:', error);
    }

    // Update UI
    this.updateHeaderDisplay();
    this.renderModelList(); // Re-render to show selected state

    // Notify subscribers of model change
    if (window.globalModelSync) {
      window.globalModelSync.updateModel(model.id);
    }

    // Callback
    if (this.options.onModelChange && typeof this.options.onModelChange === 'function') {
      this.options.onModelChange(model);
    }

    // Close dropdown
    this.closeDropdown();

    console.log('✅ Model selected:', model.id);
  }

  loadSavedModel() {
    const saved = localStorage.getItem('selectedAIModel');
    if (saved) {
      try {
        this.currentModel = JSON.parse(saved);
        this.updateHeaderDisplay();
        return;
      } catch (error) {
        console.error('Error loading saved model:', error);
      }
    }
    
    // No saved model - set GPT-4o Mini as default
    const defaultModel = this.models.price.find(m => m.isDefault) || this.models.price[0];
    if (defaultModel) {
      this.selectModel(defaultModel);
    }
  }

  /**
   * Manually refresh models list (re-renders curated list with updated pricing)
   */
  async refreshModelsNow() {
    console.log('🔄 Manual models refresh triggered');
    await this.updateModelPricing();
    this.renderModelList();
  }

  /**
   * Manually refresh credits (call this after OpenRouter API usage)
   */
  refreshCreditsNow() {
    console.log('🔄 Manual credit refresh triggered');
    this.fetchCredits();
  }

  showError(message) {
    const modelList = document.getElementById('model-list');
    if (modelList) {
      modelList.innerHTML = `<div class="error">${this.escapeHtml(message)}</div>`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    this.container.innerHTML = '';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TopNavModelSelector;
}
