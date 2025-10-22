const fetch = require('node-fetch');

class PromptGenerator {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.OPENROUTER_API_KEY;
        this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }

    /**
     * Generate prompts using ChatGPT - adapted from window.Generator.generateWithChatGPT
     */
    async generateWithChatGPT(promptText, model = 'openai/gpt-4.1-mini') {
        const maxRetries = 3;
        let attempt = 0;
        let lastError;

        while (attempt < maxRetries) {
            try {
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{
                            role: 'user',
                            content: promptText
                        }]
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }

                const data = await response.json();
                const generatedText = data.choices[0].message.content;
                
                // Parse using your exact logic
                return this.parseGeneratedPrompts(generatedText);
            } catch (error) {
                lastError = error;
                attempt++;
                if (attempt < maxRetries) {
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        throw lastError;
    }

    /**
     * Parse generated prompts - exact copy from window.Generator.parseGeneratedPrompts
     */
    parseGeneratedPrompts(text) {
        console.log('Raw response from AI:', text);
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith("Here are") && !line.startsWith("Sure,"))
            .map(prompt => {
                // Remove any accidental prefixes from the AI
                return prompt.replace(/^\/imagine prompt:\s*/i, '').trim();
            });
    }
}

module.exports = PromptGenerator;
