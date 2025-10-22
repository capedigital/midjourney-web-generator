# Electron → Web App Migration Plan

## Phase 1: Core Layout & Navigation ✅ (Starting Now)
- [ ] Dashboard layout with sidebar
- [ ] Module switching system
- [ ] Global AI model selector
- [ ] Quick navigation cards
- [ ] Recent prompts display

## Phase 2: Prompt Generation Module
- [ ] Midjourney parameters (aspect ratio, stylize, chaos, etc.)
- [ ] Parameter preview
- [ ] Generated prompts display
- [ ] Copy functionality
- [ ] Selection system for batch actions

## Phase 3: Template Builder
- [ ] Template selection dropdown
- [ ] Template enhancers grid (10 fields)
- [ ] Copywriter brief input
- [ ] Output preview
- [ ] Generate button with AI model selection

## Phase 4: Prompt Importer
- [ ] JSON/text import textarea
- [ ] Parse prompts functionality
- [ ] Preview parsed prompts
- [ ] Send to prompt generation

## Phase 5: AI Chat Assistant
- [ ] Chat interface
- [ ] Message history
- [ ] File upload (images/text)
- [ ] Template mode selector
- [ ] Auto-detect prompts in responses
- [ ] Import prompts to generation module

## Phase 6: Style Library
- [ ] Profile grid display
- [ ] Add/Edit profile modal
- [ ] Profile type selector (--p vs --sref)
- [ ] Thumbnail management
- [ ] Profile selector modal for prompt generation

## Phase 7: Settings
- [ ] API configuration
- [ ] Browser preferences
- [ ] Authentication manager (if needed for web)

## Phase 8: Claude MCP Integration (NEW)
- [ ] API endpoint to fetch pending prompts
- [ ] MCP server configuration
- [ ] Browser automation integration
- [ ] Send prompts to Midjourney via Claude

## Key Differences from Desktop:
- ✅ Multi-user authentication (already done)
- ✅ Cloud database storage (already done)
- ❌ No Electron webview (web browsers handle this)
- ❌ No AppleScript (replaced by Claude MCP + browser automation)
- ✅ Real-time collaboration potential
- ✅ Access from anywhere
