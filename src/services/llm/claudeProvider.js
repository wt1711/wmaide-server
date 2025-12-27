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

  async generateStream(config, prompt, onChunk) {
    const client = this.getClient();
    const startTime = Date.now();
    this.logStart(config.model);

    try {
      const stream = client.messages.stream({
        model: config.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      let fullText = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const text = event.delta.text || '';
          if (text) {
            fullText += text;
            onChunk(text);
          }
        }
      }

      const finalMessage = await stream.finalMessage();
      const durationMs = Date.now() - startTime;
      this.logSuccess(durationMs);

      const usage = finalMessage.usage
        ? {
            promptTokens: finalMessage.usage.input_tokens || 0,
            completionTokens: finalMessage.usage.output_tokens || 0,
            totalTokens: (finalMessage.usage.input_tokens || 0) + (finalMessage.usage.output_tokens || 0),
          }
        : null;

      return this.createResponse(fullText, usage, durationMs);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logError(durationMs, error);
      throw error;
    }
  }
}

export default new ClaudeProvider();
