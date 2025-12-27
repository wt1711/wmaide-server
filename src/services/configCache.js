import { kv } from '@vercel/kv';
import { KV_KEYS, DEFAULTS } from '../config/index.js';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_RESPONSE_CRITERIA } from '../prompts/index.js';

class ConfigCache {
  constructor() {
    this.cache = new Map();
    this.ttlMs = 5 * 60 * 1000; // 5 minute TTL
    this.lastRefresh = 0;
    this.refreshPromise = null;
  }

  async getAll() {
    const now = Date.now();
    if (now - this.lastRefresh > this.ttlMs || this.cache.size === 0) {
      // Avoid multiple concurrent refreshes
      if (!this.refreshPromise) {
        this.refreshPromise = this.refresh().finally(() => {
          this.refreshPromise = null;
        });
      }
      await this.refreshPromise;
    }
    return Object.fromEntries(this.cache);
  }

  async refresh() {
    try {
      const [model, provider, systemPrompt, responseCriteria, logPrompt] = await Promise.all([
        kv.get(KV_KEYS.llmModelName).catch(() => null),
        kv.get(KV_KEYS.llmProvider).catch(() => null),
        kv.get(KV_KEYS.systemPrompt).catch(() => null),
        kv.get(KV_KEYS.responseCriteria).catch(() => null),
        kv.get(KV_KEYS.logPrompt).catch(() => false),
      ]);

      this.cache.set('model', model || DEFAULTS.llmModel);
      this.cache.set('provider', provider || DEFAULTS.llmProvider);
      this.cache.set('systemPrompt', systemPrompt || DEFAULT_SYSTEM_PROMPT);
      this.cache.set('responseCriteria', responseCriteria || DEFAULT_RESPONSE_CRITERIA);
      this.cache.set('logPrompt', logPrompt || false);
      this.lastRefresh = Date.now();

      console.log('🔄 ConfigCache refreshed at:', new Date().toISOString());
    } catch (error) {
      console.error('ConfigCache refresh failed:', error);
      // Set defaults if refresh fails and cache is empty
      if (this.cache.size === 0) {
        this.cache.set('model', DEFAULTS.llmModel);
        this.cache.set('provider', DEFAULTS.llmProvider);
        this.cache.set('systemPrompt', DEFAULT_SYSTEM_PROMPT);
        this.cache.set('responseCriteria', DEFAULT_RESPONSE_CRITERIA);
        this.cache.set('logPrompt', false);
      }
    }
  }

  invalidate() {
    this.lastRefresh = 0;
    console.log('🗑️ ConfigCache invalidated');
  }
}

export default new ConfigCache();
