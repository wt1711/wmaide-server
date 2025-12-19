import openaiProvider from './openaiProvider.js';
import claudeProvider from './claudeProvider.js';
import grokProvider from './grokProvider.js';

const providers = {
  openai: openaiProvider,
  anthropic: claudeProvider,
  claude: claudeProvider,
  xai: grokProvider,
  grok: grokProvider,
};

export function getProvider(name = 'openai') {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${name}`);
  }
  return provider;
}
