/**
 * Base Provider Class
 *
 * All LLM providers must extend this class and implement the generate() method.
 * The generate() method must return a standardized response object.
 */
class BaseProvider {
  constructor(name) {
    if (new.target === BaseProvider) {
      throw new Error('BaseProvider is abstract and cannot be instantiated directly');
    }
    this.name = name;
    this.client = null;
  }

  /**
   * Initialize the API client. Must be implemented by subclasses.
   * @returns {Object} The initialized API client
   */
  initClient() {
    throw new Error('initClient() must be implemented by subclass');
  }

  /**
   * Get or create the API client (lazy initialization)
   * @returns {Object} The API client
   */
  getClient() {
    if (!this.client) {
      this.client = this.initClient();
    }
    return this.client;
  }

  /**
   * Generate a response from the LLM provider.
   * Must be implemented by subclasses.
   *
   * @param {Object} config - Configuration object containing model and other settings
   * @param {string} config.model - The model name to use
   * @param {string} prompt - The prompt to send to the LLM
   * @returns {Promise<StandardResponse>} Standardized response object
   */
  async generate(config, prompt) {
    throw new Error('generate() must be implemented by subclass');
  }

  /**
   * Generate a streaming response from the LLM provider.
   * Must be implemented by subclasses for streaming support.
   *
   * @param {Object} config - Configuration object containing model and other settings
   * @param {string} config.model - The model name to use
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Function} onChunk - Callback for each text chunk: (text: string) => void
   * @returns {Promise<StandardResponse>} Final result with usage stats after stream completes
   */
  async generateStream(config, prompt, onChunk) {
    throw new Error('generateStream() must be implemented by subclass');
  }

  /**
   * Create a standardized successful response object
   * @param {string} text - The generated text content
   * @param {Object} usage - Token usage information
   * @param {number} usage.promptTokens - Number of tokens in the prompt
   * @param {number} usage.completionTokens - Number of tokens in the completion
   * @param {number} usage.totalTokens - Total tokens used
   * @param {number} durationMs - Request duration in milliseconds
   * @returns {StandardResponse}
   */
  createResponse(text, usage = null, durationMs = 0) {
    return {
      text,
      usage: usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      provider: this.name,
      durationMs,
    };
  }

  /**
   * Create a standardized error response object
   * @param {string} errorMessage - The error message
   * @param {number} status - HTTP status code
   * @param {number} durationMs - Request duration in milliseconds
   * @returns {ErrorResponse}
   */
  createErrorResponse(errorMessage, status = 500, durationMs = 0) {
    return {
      error: errorMessage,
      status,
      provider: this.name,
      durationMs,
    };
  }

  /**
   * Log the start of an API call
   * @param {string} model - The model being used
   */
  logStart(model) {
    console.log(`🚀 Starting ${this.name} API call at:`, new Date().toISOString());
    console.log(`📦 Using model: ${model}`);
  }

  /**
   * Log successful completion of an API call
   * @param {number} durationMs - Duration in milliseconds
   */
  logSuccess(durationMs) {
    console.log(`✅ ${this.name} API call completed in ${durationMs}ms (${(durationMs / 1000).toFixed(2)}s)`);
  }

  /**
   * Log failed API call
   * @param {number} durationMs - Duration in milliseconds
   * @param {Error} error - The error that occurred
   */
  logError(durationMs, error) {
    console.error(`❌ ${this.name} API call failed after ${durationMs}ms (${(durationMs / 1000).toFixed(2)}s):`, error.message);
  }
}

/**
 * @typedef {Object} StandardResponse
 * @property {string} text - The generated text content
 * @property {Object} usage - Token usage information
 * @property {number} usage.promptTokens - Number of tokens in the prompt
 * @property {number} usage.completionTokens - Number of tokens in the completion
 * @property {number} usage.totalTokens - Total tokens used
 * @property {string} provider - The provider name
 * @property {number} durationMs - Request duration in milliseconds
 */

/**
 * @typedef {Object} ErrorResponse
 * @property {string} error - The error message
 * @property {number} status - HTTP status code
 * @property {string} provider - The provider name
 * @property {number} durationMs - Request duration in milliseconds
 */

export default BaseProvider;
