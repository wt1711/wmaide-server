import Anthropic from '@anthropic-ai/sdk';
import BaseProvider from './baseProvider.js';
import { API_KEYS } from '../../config/index.js';

class ClaudeProvider extends BaseProvider {
  constructor() {
    super('anthropic');
  }

  initClient() {
    return new Anthropic({
      apiKey: API_KEYS.anthropic,
    });
  }

  async generate(config, prompt) {
    const client = this.getClient();
    const startTime = Date.now();
    this.logStart(config.model);

    try {
      const response = await client.messages.create({
        model: config.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const durationMs = Date.now() - startTime;
      this.logSuccess(durationMs);

      const textContent = response.content.find((block) => block.type === 'text');
      const text = textContent?.text || '';
      const usage = response.usage
        ? {
            promptTokens: response.usage.input_tokens || 0,
            completionTokens: response.usage.output_tokens || 0,
            totalTokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
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

export default new ClaudeProvider();
