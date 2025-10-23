const discordService = require('../services/discordService');
const db = require('../config/database');
const logger = require('../middleware/logger');

/**
 * Send a single prompt to Discord/Midjourney
 */
exports.sendPrompt = async (req, res) => {
  try {
    const { prompt, channelId } = req.body;
    const userId = req.user.id;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get user's Discord settings
    const result = await db.query(
      'SELECT discord_bot_token, discord_channel_id, discord_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.discord_enabled) {
      return res.status(400).json({ error: 'Discord integration is not enabled. Please enable it in Settings.' });
    }

    if (!user.discord_bot_token) {
      return res.status(400).json({ error: 'Discord bot token is not configured. Please add it in Settings.' });
    }

    // Use provided channelId or fall back to user's saved channel
    const targetChannelId = channelId || user.discord_channel_id;

    if (!targetChannelId) {
      return res.status(400).json({ error: 'Discord channel ID is not configured. Please add it in Settings.' });
    }

    // Send the message via Discord
    const response = await discordService.sendMessage(
      user.discord_bot_token,
      targetChannelId,
      prompt
    );

    logger.debug('Discord message sent successfully', { userId, channelId: targetChannelId });

    res.json({
      success: true,
      message: 'Prompt sent to Discord successfully',
      messageId: response.id
    });
  } catch (error) {
    logger.error('Error sending prompt to Discord:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('Unauthorized')) {
      return res.status(401).json({ error: 'Invalid Discord bot token. Please check your Settings.' });
    }
    if (error.message.includes('Unknown Channel')) {
      return res.status(404).json({ error: 'Discord channel not found. Please check your channel ID in Settings.' });
    }
    if (error.message.includes('Missing Permissions')) {
      return res.status(403).json({ error: 'Bot lacks permission to send messages in this channel.' });
    }
    if (error.message.includes('rate limit')) {
      return res.status(429).json({ error: 'Discord rate limit reached. Please wait a moment and try again.' });
    }

    res.status(500).json({ error: 'Failed to send prompt to Discord', details: error.message });
  }
};

/**
 * Send multiple prompts to Discord (batch)
 */
exports.sendBatch = async (req, res) => {
  try {
    const { prompts, channelId, delayMs = 1000 } = req.body;
    const userId = req.user.id;

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: 'Prompts array is required' });
    }

    if (prompts.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 prompts per batch' });
    }

    // Get user's Discord settings
    const result = await db.query(
      'SELECT discord_bot_token, discord_channel_id, discord_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.discord_enabled) {
      return res.status(400).json({ error: 'Discord integration is not enabled' });
    }

    if (!user.discord_bot_token) {
      return res.status(400).json({ error: 'Discord bot token is not configured' });
    }

    const targetChannelId = channelId || user.discord_channel_id;

    if (!targetChannelId) {
      return res.status(400).json({ error: 'Discord channel ID is not configured' });
    }

    // Send prompts with delay to avoid rate limits
    const results = await discordService.sendBatch(
      user.discord_bot_token,
      targetChannelId,
      prompts,
      delayMs
    );

    logger.debug('Batch send completed', { userId, total: prompts.length, successful: results.successful.length });

    res.json({
      success: true,
      total: prompts.length,
      successful: results.successful.length,
      failed: results.failed.length,
      results: results
    });
  } catch (error) {
    logger.error('Error sending batch to Discord:', error);
    res.status(500).json({ error: 'Failed to send batch to Discord', details: error.message });
  }
};

/**
 * Test Discord connection with user's credentials
 */
exports.testConnection = async (req, res) => {
  try {
    const { botToken, channelId } = req.body;
    const userId = req.user.id;

    if (!botToken || !channelId) {
      return res.status(400).json({ error: 'Bot token and channel ID are required' });
    }

    // Test the connection
    const isValid = await discordService.testConnection(botToken, channelId);

    if (isValid) {
      logger.debug('Discord connection test successful', { userId });
      res.json({ success: true, message: 'Discord connection successful!' });
    } else {
      res.status(400).json({ error: 'Failed to connect to Discord. Please check your credentials.' });
    }
  } catch (error) {
    logger.error('Discord connection test failed:', error);
    
    if (error.message.includes('Unauthorized')) {
      return res.status(401).json({ error: 'Invalid bot token' });
    }
    if (error.message.includes('Unknown Channel')) {
      return res.status(404).json({ error: 'Channel not found or bot lacks access' });
    }

    res.status(500).json({ error: 'Connection test failed', details: error.message });
  }
};
