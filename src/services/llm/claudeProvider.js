import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

let anthropicClient = null;

function getClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

const claudeProvider = {
  name: 'anthropic',

  async generate(config, prompt) {
    const anthropic = getClient();
    const startTime = Date.now();
    console.log('🚀 Starting Anthropic API call at:', new Date().toISOString());
    console.log(`📦 Using model: ${config.model}`);
    console.log(`🔑 API Key present: ${!!process.env.ANTHROPIC_API_KEY}`);

    try {
      const response = await anthropic.messages.create({
        model: config.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`✅ Anthropic API call completed in ${duration}ms (${(duration / 1000).toFixed(2)}s)`);

      // Extract text content from the response
      const textContent = response.content.find(block => block.type === 'text');
      return textContent?.text || null;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`❌ Anthropic API call failed after ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        type: error.type || error.constructor.name,
      });
      throw error;
    }
  },
};

export default claudeProvider;
