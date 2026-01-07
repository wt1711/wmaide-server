import dotenv from 'dotenv';

dotenv.config();

// API Keys
export const API_KEYS = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  xai: process.env.XAI_API_KEY,
};

// Assistant Configuration
export const ASSISTANT_ID = process.env.ASSISTANT_ID;

// KV Configuration
export const KV_CONFIG = {
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
};

// Default Values
export const DEFAULTS = {
  llmModel: 'gpt-4o',
  llmProvider: 'openai',
  port: 3000,
};

// KV Keys
export const KV_KEYS = {
  systemPrompt: 'SYSTEM_PROMPT',
  llmModelName: 'LLM_MODEL_NAME',
  llmProvider: 'LLM_PROVIDER',
  responseCriteria: 'RESPONSE_CRITERIA',
  versionList: 'VERSION_LIST',
  logPrompt: 'LOG_PROMPT',
  currentFullPrompt: 'CURRENT_FULL_PROMPT',
  currentAnalysis: 'CURRENT_ANALYSIS',
  userCredits: 'USER_CREDITS',
};

// Admin users (bypass credit limits)
export const ADMIN_USERS = ['admin', 'vixx-admin', '@instagram_56911609594', '@instagram_1340551653:matrix.lvbrd.xyz'];

// Credit limits
export const CREDIT_LIMITS = {
  freeCredits: 50,
  limitReachedMessage: 'You have used all of your free credit. Contact VIXX team for an upgrade',
};

// Provider API Base URLs
export const PROVIDER_URLS = {
  xai: 'https://api.x.ai/v1',
};

export default {
  API_KEYS,
  ASSISTANT_ID,
  KV_CONFIG,
  DEFAULTS,
  KV_KEYS,
  PROVIDER_URLS,
  ADMIN_USERS,
  CREDIT_LIMITS,
};
