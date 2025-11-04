/**
 * Centralized History Service
 * Handles saving prompt history to the backend database
 */

const HistoryService = {
    /**
     * Save prompts to history
     * @param {string} inputText - The original input/request
     * @param {Array|string} prompts - Generated prompts (array or single string)
     * @param {string} model - Model/source identifier (e.g., 'gpt-4', 'midjourney-browser-batch')
     * @returns {Promise<boolean>} Success status
     */
    async save(inputText, prompts, model) {
        const token = localStorage.getItem('token');
        if (!token) {
            return false;
        }
        
        try {
            // Ensure prompts is an array
            const promptsArray = Array.isArray(prompts) ? prompts : [prompts];
            
            const response = await fetch('/api/prompts/save-imported', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    inputText: inputText || '',
                    prompts: promptsArray,
                    model: model || 'unknown'
                })
            });
            
            const data = await response.json();
            return data.success === true;
        } catch (error) {
            // Silent fail - history save is not critical
            console.error('History save failed:', error.message);
            return false;
        }
    },
    
    /**
     * Save batch operation to history
     * @param {string} service - 'midjourney' or 'ideogram'
     * @param {Array<string>} prompts - Array of prompts
     * @returns {Promise<boolean>} Success status
     */
    async saveBatch(service, prompts) {
        const inputText = `Batch of ${prompts.length} prompts sent to ${service}`;
        const model = `${service}-browser-batch`;
        return this.save(inputText, prompts, model);
    }
};

// Export to window
window.HistoryService = HistoryService;
