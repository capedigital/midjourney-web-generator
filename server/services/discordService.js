
/**
 * Discord Service
 * Handles sending messages to Discord channels via REST API
 * Uses webhooks for Midjourney command execution
 */

const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Send a message via Discord webhook
 * Webhooks bypass the bot interaction requirement and send as a "user"
 * @param {string} webhookUrl - Discord webhook URL
 * @param {string} content - Message content (e.g., /imagine prompt: ...)
 * @returns {Promise<object>} Discord message object
 */
async function sendWebhookMessage(webhookUrl, content) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        content,
        username: 'PromptLab' // Optional: customize webhook username
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord webhook error (${response.status}): ${error}`);
    }

    // Webhooks with ?wait=true return the message object
    if (webhookUrl.includes('wait=true')) {
      return await response.json();
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending webhook message:', error);
    throw error;
  }
}

/**
 * Send a message to a Discord channel (legacy bot token method)
 * @param {string} botToken - Discord bot token
 * @param {string} channelId - Discord channel ID
 * @param {string} content - Message content
 * @returns {Promise<object>} Discord message object
 */
async function sendMessage(botToken, channelId, content) {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Discord API error (${response.status}): ${error.message || response.statusText}`);
    }

    const message = await response.json();
    return message;
  } catch (error) {
    console.error('Error sending Discord message:', error);
    throw error;
  }
}

/**
 * Send multiple messages with delay to avoid rate limits
 * Supports both webhook and bot token methods
 * @param {string} authToken - Discord bot token OR webhook URL
 * @param {string} channelId - Discord channel ID (ignored if using webhook)
 * @param {string[]} prompts - Array of prompt strings
 * @param {number} delayMs - Delay between messages in milliseconds
 * @returns {Promise<object>} Results object with successful and failed arrays
 */
async function sendBatch(authToken, channelId, prompts, delayMs = 1000) {
  const results = {
    successful: [],
    failed: []
  };

  // Detect if authToken is a webhook URL
  const isWebhook = authToken.startsWith('https://discord.com/api/webhooks/') || 
                    authToken.startsWith('https://discordapp.com/api/webhooks/');

  for (let i = 0; i < prompts.length; i++) {
    try {
      let message;
      if (isWebhook) {
        message = await sendWebhookMessage(authToken, prompts[i]);
      } else {
        message = await sendMessage(authToken, channelId, prompts[i]);
      }
      
      results.successful.push({
        index: i,
        prompt: prompts[i],
        messageId: message.id || 'webhook-sent'
      });

      // Add delay between messages (except for the last one)
      if (i < prompts.length - 1) {
        await sleep(delayMs);
      }
    } catch (error) {
      results.failed.push({
        index: i,
        prompt: prompts[i],
        error: error.message
      });

      // If we hit rate limit, increase delay
      if (error.message.includes('rate limit')) {
        console.log('Rate limit hit, increasing delay');
        await sleep(delayMs * 2);
      }
    }
  }

  return results;
}

/**
 * Test Discord connection
 * Supports both webhook and bot token
 * @param {string} authToken - Discord bot token OR webhook URL
 * @param {string} channelId - Discord channel ID (ignored if using webhook)
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection(authToken, channelId) {
  try {
    // Detect if authToken is a webhook URL
    const isWebhook = authToken.startsWith('https://discord.com/api/webhooks/') || 
                      authToken.startsWith('https://discordapp.com/api/webhooks/');

    if (isWebhook) {
      // Test webhook by fetching webhook info
      const response = await fetch(authToken, {
        method: 'GET'
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Webhook error (${response.status}): ${error}`);
      }

      const webhook = await response.json();
      console.log('Discord webhook test successful', { webhookName: webhook.name, channelId: webhook.channel_id });
      return true;
    } else {
      // Test bot token by fetching channel info
      const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bot ${authToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Discord API error (${response.status}): ${error.message || response.statusText}`);
      }

      const channel = await response.json();
      console.log('Discord connection test successful', { channelName: channel.name });
      return true;
    }
  } catch (error) {
    console.error('Discord connection test failed:', error);
    throw error;
  }
}

/**
 * Sleep utility for delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  sendMessage,
  sendWebhookMessage,
  sendBatch,
  testConnection
};
