const logger = require('../middleware/logger');

/**
 * Discord Service
 * Handles sending messages to Discord channels via REST API
 * Uses fetch instead of discord.js for lightweight integration
 */

const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Send a message to a Discord channel
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
    logger.error('Error sending Discord message:', error);
    throw error;
  }
}

/**
 * Send multiple messages with delay to avoid rate limits
 * Discord rate limit: 5 messages per 5 seconds per channel (with burst allowance)
 * @param {string} botToken - Discord bot token
 * @param {string} channelId - Discord channel ID
 * @param {string[]} prompts - Array of prompt strings
 * @param {number} delayMs - Delay between messages in milliseconds
 * @returns {Promise<object>} Results object with successful and failed arrays
 */
async function sendBatch(botToken, channelId, prompts, delayMs = 1000) {
  const results = {
    successful: [],
    failed: []
  };

  for (let i = 0; i < prompts.length; i++) {
    try {
      const message = await sendMessage(botToken, channelId, prompts[i]);
      results.successful.push({
        index: i,
        prompt: prompts[i],
        messageId: message.id
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
        logger.debug('Rate limit hit, increasing delay');
        await sleep(delayMs * 2);
      }
    }
  }

  return results;
}

/**
 * Test Discord connection by fetching channel info
 * @param {string} botToken - Discord bot token
 * @param {string} channelId - Discord channel ID
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection(botToken, channelId) {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${botToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Discord API error (${response.status}): ${error.message || response.statusText}`);
    }

    const channel = await response.json();
    logger.debug('Discord connection test successful', { channelName: channel.name });
    return true;
  } catch (error) {
    logger.error('Discord connection test failed:', error);
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
  sendBatch,
  testConnection
};
