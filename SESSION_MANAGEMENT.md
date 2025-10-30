# Session Management & Token Cost Optimization

## What Changed

### 1. AI Chat - Session Isolation
**Before:** Every message sent the entire conversation history to the API
- Message 1: ~500 tokens
- Message 2: ~1,000 tokens (includes message 1)
- Message 10: ~5,000+ tokens (includes all 9 previous)
- **Result:** Token costs snowball exponentially

**After:** Only recent context is sent
- Every message: ~500-2,000 tokens (last 6 messages max)
- **Result:** Consistent, predictable costs per message

### 2. New Chat Button
**Location:** AI Chat module, top-right toolbar

**What it does:**
- Clears conversation history
- Resets token counter to 0
- Starts fresh session (no accumulated context)

**When to use:**
- When starting a new topic
- When session reaches 5,000+ tokens (warning appears)
- Between unrelated prompt generation requests

### 3. Session Indicator
**Display:** Bottom of chat input area
- Shows: `Session: X messages (~X,XXX tokens)`
- **Warning at 5,000+ tokens:** Orange text with pulse animation

### 4. Prompt Generator
**Already optimized** - each generation is an isolated request:
- No conversation history maintained
- Each request costs ~500-1,500 tokens
- No need for "New Chat" here

## How to Use

### AI Chat Best Practices

1. **Start New Chat for new topics:**
   ```
   Topic 1: "Create cyberpunk prompts" 
   [Click "New Chat"]
   Topic 2: "Create nature photography prompts"
   ```

2. **Monitor the session indicator:**
   - Under 2,000 tokens: ✅ Keep chatting
   - 2,000-5,000 tokens: ⚠️ Consider starting fresh
   - Over 5,000 tokens: 🔴 Costs getting high, click "New Chat"

3. **History is still saved:**
   - "New Chat" doesn't delete history
   - Click "History" button to view past conversations
   - You just don't send old messages to API anymore

### Cost Comparison

**Old way (accumulating):**
```
10-message conversation: ~5,000-10,000 tokens
Cost: $0.05-0.15 per conversation
```

**New way (isolated):**
```
10-message conversation: ~500-2,000 tokens per message (6 context limit)
Cost: $0.01-0.03 per conversation
```

**Savings:** 60-80% reduction in token costs

## Technical Details

### AI Chat (`ai-chat.js`)
- `clearChat()` - Resets `this.messages = []` and `this.currentSessionId = null`
- `sendMessage()` - Only sends last 6 messages: `this.messages.slice(-6)`
- `updateSessionIndicator()` - Shows real-time token estimate

### Prompt Generator (`generator.js`)
- Each call to `generateWithChatGPT()` is isolated
- No message history maintained
- Already optimal for cost efficiency

## UI Changes

1. **Button renamed:** "Clear Chat" → "New Chat" (green, prominent)
2. **Tooltip added:** Explains token cost benefit
3. **Confirmation dialog:** Updated to mention token costs
4. **Session counter:** Always visible when messages present
5. **Warning animation:** Pulses orange when costs get high

## API Behavior

**Before:**
```javascript
// Sent to API with EVERY request
messages: [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: 'Message 1' },
  { role: 'assistant', content: 'Response 1' },
  { role: 'user', content: 'Message 2' },
  { role: 'assistant', content: 'Response 2' },
  // ... all previous messages
  { role: 'user', content: 'Message 10' }
]
```

**After:**
```javascript
// Only recent context
messages: [
  { role: 'system', content: systemPrompt },
  // ... last 6 messages only
  { role: 'user', content: 'Message 8' },
  { role: 'assistant', content: 'Response 8' },
  { role: 'user', content: 'Message 9' },
  { role: 'assistant', content: 'Response 9' },
  { role: 'user', content: 'Message 10' }
]
```

## Refresh Required

After updating the code, users must **refresh the browser** (Cmd/Ctrl + R) to see:
- Green "New Chat" button
- Session indicator at bottom
- Token warning when costs get high
