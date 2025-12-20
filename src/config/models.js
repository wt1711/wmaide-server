/**
 * Available LLM providers and their models
 * Structured for extensibility (prices, notes, etc.)
 */
export const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'o1' },
      { id: 'o3' },
      { id: 'o4-mini' },
      { id: 'gpt-3.5-turbo' },
      { id: 'gpt-4o' },
      { id: 'gpt-4.1' },
      { id: 'gpt-5-chat-latest' },
      { id: 'gpt-5' },
      { id: 'gpt-5.1' },
      { id: 'gpt-5.2' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    models: [
      { id: 'claude-sonnet-4-20250514' },
      { id: 'claude-sonnet-4-5-20250929' },
      { id: 'claude-opus-4-5-20251101' },
      { id: 'claude-haiku-4-5-20251001' },
    ],
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    models: [
      { id: 'grok-4-0709' },
      { id: 'grok-4-1-fast-reasoning' },
      { id: 'grok-3' },
    ],
  },
];

/**
 * Get models for a specific provider
 * @param {string} providerId - The provider ID
 * @returns {Array} Array of models or empty array if provider not found
 */
export function getModelsForProvider(providerId) {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  return provider ? provider.models : [];
}

/**
 * Check if a model belongs to a provider
 * @param {string} providerId - The provider ID
 * @param {string} modelId - The model ID
 * @returns {boolean}
 */
export function isValidModelForProvider(providerId, modelId) {
  const models = getModelsForProvider(providerId);
  return models.some((m) => m.id === modelId);
}

export default PROVIDERS;
