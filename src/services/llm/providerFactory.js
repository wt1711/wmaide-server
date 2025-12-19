import openaiProvider from './openaiProvider.js';
import claudeProvider from './claudeProvider.js';

const providers = {
  openai: openaiProvider,
  anthropic: claudeProvider,
  claude: claudeProvider,
};

export function getProvider(name = 'openai') {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${name}`);
  }
  return provider;
}
