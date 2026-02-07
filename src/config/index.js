import dotenv from "dotenv";

dotenv.config();

// API Keys
export const API_KEYS = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  xai: process.env.XAI_API_KEY,
  gemini: process.env.GOOGLE_API_KEY,
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
  llmModel: "gpt-4o",
  llmProvider: "openai",
  port: 3000,
};

// KV Keys
export const KV_KEYS = {
  systemPrompt: "SYSTEM_PROMPT",
  llmModelName: "LLM_MODEL_NAME",
  llmProvider: "LLM_PROVIDER",
  responseCriteria: "RESPONSE_CRITERIA",
  versionList: "VERSION_LIST",
  logPrompt: "LOG_PROMPT",
  currentFullPrompt: "CURRENT_FULL_PROMPT",
  currentAnalysis: "CURRENT_ANALYSIS",
  userCredits: "USER_CREDITS",
  analyzeIntentPrompt: "ANALYZE_INTENT_PROMPT",
  analyzeIntentMessageFormat: "ANALYZE_INTENT_MESSAGE_FORMAT",
  generateFromDirectionPrompt: "GENERATE_FROM_DIRECTION_PROMPT",
  generateFromDirectionMessageFormat: "GENERATE_FROM_DIRECTION_MESSAGE_FORMAT",
  gradeOwnMessagePrompt: "GRADE_OWN_MESSAGE_PROMPT",
  gradeOwnMessageMessageFormat: "GRADE_OWN_MESSAGE_MESSAGE_FORMAT",
  latestAnalyzeIntentPrompt: "LATEST_ANALYZE_INTENT_PROMPT",
  latestGenerateFromDirectionPrompt: "LATEST_GENERATE_FROM_DIRECTION_PROMPT",
  latestGradeOwnMessagePrompt: "LATEST_GRADE_OWN_MESSAGE_PROMPT",
  suggestionPrompt: "SUGGESTION_PROMPT",
  suggestionMessageFormat: "SUGGESTION_MESSAGE_FORMAT",
  latestSuggestionPrompt: "LATEST_SUGGESTION_PROMPT",
  generateResponseFormat: "GENERATE_RESPONSE_FORMAT",
};

// Admin users (bypass credit limits)
export const ADMIN_USERS = [
  "admin",
  "vixx-admin",
  "@instagram_1535273395:matrix.lvbrd.xyz", // lovefish49
  "@instagram_1340551653:matrix.lvbrd.xyz", // ngxhoanghai
];

// Premium users (200 credits)
export const PREMIUM_USERS = [
  "@instagram_421229918:matrix.lvbrd.xyz", // dtran1004
  "@instagram_7730134120:matrix.lvbrd.xyz", // minh.lt_
  "@instagram_3487576414:matrix.lvbrd.xyz", // dkieeuu
  "@instagram_56911609594:matrix.lvbrd.xyz", // vedup.1711
];

// Credit limits
export const CREDIT_LIMITS = {
  freeCredits: 5,
  premiumCredits: 200,
  limitReachedMessage: `
  [emotion] ... [reason] All credits used. Chat with team to upgrade \n`,
};

// Provider API Base URLs
export const PROVIDER_URLS = {
  xai: "https://api.x.ai/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
};

export default {
  API_KEYS,
  ASSISTANT_ID,
  KV_CONFIG,
  DEFAULTS,
  KV_KEYS,
  PROVIDER_URLS,
  ADMIN_USERS,
  PREMIUM_USERS,
  CREDIT_LIMITS,
};
