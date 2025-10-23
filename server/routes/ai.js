const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const fetch = require('node-fetch');

// OpenRouter API proxy endpoint
// This keeps the API key secure on the server side
router.post('/generate', asyncHandler(async (req, res) => {
    const { model, messages, stream, temperature, max_tokens } = req.body;
    
    if (!model || !messages) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: model and messages'
        });
    }
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error('OPENROUTER_API_KEY not configured');
        return res.status(500).json({
            success: false,
            error: 'API key not configured on server'
        });
    }
    
    try {
        const requestBody = {
            model,
            messages
        };
        
        // Add optional parameters
        if (stream !== undefined) requestBody.stream = stream;
        if (temperature !== undefined) requestBody.temperature = temperature;
        if (max_tokens !== undefined) requestBody.max_tokens = max_tokens;
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': req.get('origin') || req.get('referer') || 'http://localhost:3000',
                'X-Title': 'Midjourney Generator'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error('OpenRouter API error:', error);
            return res.status(response.status).json({
                success: false,
                error: `API error: ${response.status}`
            });
        }
        
        // If streaming, pipe the response directly to client
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            // Pipe the stream from OpenRouter to the client
            response.body.pipe(res);
            
            // Handle client disconnect
            req.on('close', () => {
                response.body.destroy();
            });
        } else {
            // Non-streaming: return complete response
            const data = await response.json();
            res.json({
                success: true,
                data
            });
        }
    } catch (error) {
        console.error('Error calling OpenRouter API:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

module.exports = router;
