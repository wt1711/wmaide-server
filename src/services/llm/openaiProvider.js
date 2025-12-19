import OpenAI from 'openai';
import BaseProvider from './baseProvider.js';
import { API_KEYS } from '../../config/index.js';

class OpenAIProvider extends BaseProvider {
  constructor() {
    super('openai');
  }

  initClient() {
    return new OpenAI({
      apiKey: API_KEYS.openai,
    });
  }

  async generate(config, prompt) {
    const client = this.getClient();
    const startTime = Date.now();
    this.logStart(config.model);

    try {
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
      });

      const durationMs = Date.now() - startTime;
      this.logSuccess(durationMs);

      const text = response.choices[0].message.content || '';
      const usage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens || 0,
            completionTokens: response.usage.completion_tokens || 0,
            totalTokens: response.usage.total_tokens || 0,
          }
        : null;

      return this.createResponse(text, usage, durationMs);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logError(durationMs, error);
      throw error;
    }
  }
}

export default new OpenAIProvider();
