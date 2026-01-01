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

/**
 * Get an LLM provider by name
 * @param {string} name - Provider name (openai, anthropic, claude, xai, grok)
 * @returns {Object} The provider instance
 * @throws {Error} If provider name is unknown
 */
export function getProvider(name = 'openai') {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${name}`);
  }
  return provider;
}

/**
 * Wrap provider generate call with standardized error handling
 * @param {Object} provider - The LLM provider instance
 * @param {Object} config - Configuration object
 * @param {string} prompt - The prompt to send
 * @returns {Promise<Object>} Standardized response or error object
 */
export async function safeGenerate(provider, config, prompt) {
  const startTime = Date.now();

  try {
    const result = await provider.generate(config, prompt);
    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Determine appropriate error status
    let status = 500;
    let errorMessage = 'Provider Error';

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      status = 504;
      errorMessage = 'Provider Timeout';
    } else if (error.status === 429 || error.message?.includes('rate limit')) {
      status = 429;
      errorMessage = 'Rate Limit Exceeded';
    } else if (error.status === 401 || error.message?.includes('auth')) {
      status = 401;
      errorMessage = 'Authentication Failed';
    } else if (error.status === 400) {
      status = 400;
      errorMessage = 'Bad Request';
    } else if (error.status >= 500 || error.message?.includes('server')) {
      status = 502;
      errorMessage = 'Provider Unavailable';
    }

    console.error(`Provider ${provider.name} failed:`, {
      error: error.message,
      status,
      durationMs,
    });

    return {
      error: errorMessage,
      status,
      provider: provider.name,
      durationMs,
      details: error.message,
    };
  }
}

/**
 * Get provider and generate with error handling in one call
 * @param {string} providerName - Provider name
 * @param {Object} config - Configuration object
 * @param {string} prompt - The prompt to send
 * @returns {Promise<Object>} Standardized response or error object
 */
export async function generateWithErrorHandling(providerName, config, prompt) {
  try {
    const provider = getProvider(providerName);
    return await safeGenerate(provider, config, prompt);
  } catch (error) {
    // Provider not found error
    return {
      error: error.message,
      status: 400,
      provider: providerName,
      durationMs: 0,
    };
  }
}

/**
 * Wrap provider generateStream call with standardized error handling
 * @param {Object} provider - The LLM provider instance
 * @param {Object} config - Configuration object
 * @param {string} prompt - The prompt to send
 * @param {Function} onChunk - Callback for each text chunk
 * @returns {Promise<Object>} Standardized response or error object
 */
export async function safeGenerateStream(provider, config, prompt, onChunk) {
  const startTime = Date.now();

  try {
    const result = await provider.generateStream(config, prompt, onChunk);
    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;

    let status = 500;
    let errorMessage = 'Provider Error';

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      status = 504;
      errorMessage = 'Provider Timeout';
    } else if (error.status === 429 || error.message?.includes('rate limit')) {
      status = 429;
      errorMessage = 'Rate Limit Exceeded';
    } else if (error.status === 401 || error.message?.includes('auth')) {
      status = 401;
      errorMessage = 'Authentication Failed';
    } else if (error.status === 400) {
      status = 400;
      errorMessage = 'Bad Request';
    } else if (error.status >= 500 || error.message?.includes('server')) {
      status = 502;
      errorMessage = 'Provider Unavailable';
    }

    console.error(`Provider ${provider.name} streaming failed:`, {
      error: error.message,
      status,
      durationMs,
    });

    return {
      error: errorMessage,
      status,
      provider: provider.name,
      durationMs,
      details: error.message,
    };
  }
}

/**
 * Get provider and generate stream with error handling in one call
 * @param {string} providerName - Provider name
 * @param {Object} config - Configuration object
 * @param {string} prompt - The prompt to send
 * @param {Function} onChunk - Callback for each text chunk
 * @returns {Promise<Object>} Standardized response or error object
 */
export async function generateStreamWithErrorHandling(providerName, config, prompt, onChunk) {
  try {
    const provider = getProvider(providerName);
    return await safeGenerateStream(provider, config, prompt, onChunk);
  } catch (error) {
    return {
      error: error.message,
      status: 400,
      provider: providerName,
      durationMs: 0,
    };
  }
}
