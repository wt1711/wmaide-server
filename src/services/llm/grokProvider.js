import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let grokClient = null;

function getClient() {
  if (!grokClient) {
    grokClient = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });
  }
  return grokClient;
}

const grokProvider = {
  name: 'xai',

  async generate(config, prompt) {
    const client = getClient();
    const startTime = Date.now();
    console.log('🚀 Starting xAI Grok API call at:', new Date().toISOString());
    console.log(`📦 Using model: ${config.model}`);

    try {
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`✅ xAI Grok API call completed in ${duration}ms (${(duration / 1000).toFixed(2)}s)`);

      return response.choices[0].message.content || null;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`❌ xAI Grok API call failed after ${duration}ms (${(duration / 1000).toFixed(2)}s):`, error);
      throw error;
    }
  },
};

export default grokProvider;
