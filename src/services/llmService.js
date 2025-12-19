import { kv } from '@vercel/kv';
import { generateWithErrorHandling } from './llm/providerFactory.js';
import { DEFAULTS, KV_KEYS } from '../config/index.js';

async function getConfig() {
  let model = DEFAULTS.llmModel;
  let provider = DEFAULTS.llmProvider;

  try {
    const kvModel = await kv.get(KV_KEYS.llmModelName);
    if (kvModel) {
      model = kvModel;
    }
  } catch (error) {
    console.error('Failed to fetch LLM_MODEL_NAME from KV, using default:', error);
  }

  try {
    const kvProvider = await kv.get(KV_KEYS.llmProvider);
    if (kvProvider) {
      provider = kvProvider;
    }
  } catch (error) {
    console.error('Failed to fetch LLM_PROVIDER from KV, using default:', error);
  }

  return { model, provider };
}

/**
 * Generate a response from the configured LLM provider
 * @param {string} prompt - The prompt to send
 * @returns {Promise<Object>} Standardized response object with text, usage, provider, durationMs
 *                           or error object with error, status, provider, durationMs
 */
export async function generateResponse(prompt) {
  const config = await getConfig();
  return generateWithErrorHandling(config.provider, config, prompt);
}
