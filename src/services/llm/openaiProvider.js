import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let openaiClient = null;

function getClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

const openaiProvider = {
  name: 'openai',

  async generate(config, prompt) {
    const openai = getClient();
    const startTime = Date.now();
    console.log('🚀 Starting OpenAI API call at:', new Date().toISOString());
    console.log(`📦 Using model: ${config.model}`);

    try {
      const response = await openai.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`✅ OpenAI API call completed in ${duration}ms (${(duration / 1000).toFixed(2)}s)`);

      return response.choices[0].message.content || null;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`❌ OpenAI API call failed after ${duration}ms (${(duration / 1000).toFixed(2)}s):`, error);
      throw error;
    }
  },
};

export default openaiProvider;
