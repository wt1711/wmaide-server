/**
 * Available LLM providers and their models
 * Structured for extensibility (prices, notes, etc.)
 */
export const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'o1', 'input_price': 15},
      { id: 'o3', 'input_price': 2},
      { id: 'o4-mini', 'input_price': 1.1 },
      { id: 'gpt-3.5-turbo', 'input_price': 0.5},
      { id: 'gpt-4o', 'input_price': 2.5 },
      { id: 'gpt-4.1', 'input_price': 2 },
      { id: 'gpt-5-chat-latest', 'input_price': 1.25 },
      { id: 'gpt-5', 'input_price': 1.25 },
      { id: 'gpt-5.1', 'input_price': 1.25 },
      { id: 'gpt-5.2', 'input_price': 1.75 },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    models: [
      { id: 'claude-sonnet-4-20250514', 'input_price': 3 },
      { id: 'claude-sonnet-4-5-20250929', 'input_price': 3 },
      { id: 'claude-opus-4-5-20251101', 'input_price': 5 },
      { id: 'claude-haiku-4-5-20251001', 'input_price': 1 },
    ],
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    models: [
      { id: 'grok-4-0709', 'input_price': 3 },
      { id: 'grok-4-1-fast-reasoning', 'input_price': 0.2 },
      { id: 'grok-3', 'input_price': 3 },
    ],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-pro-3', 'input_price': 1.25 },
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
