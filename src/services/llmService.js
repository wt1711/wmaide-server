import { kv } from '@vercel/kv';
import { getProvider } from './llm/providerFactory.js';

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_PROVIDER = 'openai';

async function getConfig() {
  let model = DEFAULT_MODEL;
  let provider = DEFAULT_PROVIDER;

  try {
    const kvModel = await kv.get('LLM_MODEL_NAME');
    if (kvModel) {
      model = kvModel;
    }
  } catch (error) {
    console.error('Failed to fetch LLM_MODEL_NAME from KV, using default:', error);
  }

  try {
    const kvProvider = await kv.get('LLM_PROVIDER');
    if (kvProvider) {
      provider = kvProvider;
    }
  } catch (error) {
    console.error('Failed to fetch LLM_PROVIDER from KV, using default:', error);
  }

  return { model, provider };
}

export async function generateResponse(prompt) {
  const config = await getConfig();
  const llmProvider = getProvider(config.provider);
  return llmProvider.generate(config, prompt);
}
