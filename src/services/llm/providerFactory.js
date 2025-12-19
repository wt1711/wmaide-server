import openaiProvider from './openaiProvider.js';

const providers = {
  openai: openaiProvider,
};

export function getProvider(name = 'openai') {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${name}`);
  }
  return provider;
}
