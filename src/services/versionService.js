import { kv } from '@vercel/kv';
import { DEFAULTS, KV_KEYS } from '../config/index.js';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_RESPONSE_CRITERIA } from '../prompts/index.js';

// KV Key for storing versions
const VERSIONS_KEY = 'PROMPT_VERSIONS';

// Default configuration for version snapshots
export const DEFAULT_CONFIG = {
  SYSTEM_PROMPT: DEFAULT_SYSTEM_PROMPT,
  RESPONSE_CRITERIA: DEFAULT_RESPONSE_CRITERIA,
  LLM_MODEL_NAME: DEFAULTS.llmModel,
  LLM_PROVIDER: DEFAULTS.llmProvider,
};

/**
 * Generate a unique version ID
 */
function generateVersionId() {
  return `v_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Save a new version snapshot of the prompt configuration
 * @param {object} configData - The configuration data to save
 * @param {string} description - Description of this version
 * @returns {object} The saved version object
 */
export async function saveNewVersion(configData, description = '') {
  const versionId = generateVersionId();
  const timestamp = new Date().toISOString();

  const version = {
    id: versionId,
    description,
    timestamp,
    configData: {
      SYSTEM_PROMPT: configData.SYSTEM_PROMPT || DEFAULT_CONFIG.SYSTEM_PROMPT,
      RESPONSE_CRITERIA: configData.RESPONSE_CRITERIA || DEFAULT_CONFIG.RESPONSE_CRITERIA,
      LLM_MODEL_NAME: configData.LLM_MODEL_NAME || DEFAULT_CONFIG.LLM_MODEL_NAME,
      LLM_PROVIDER: configData.LLM_PROVIDER || DEFAULT_CONFIG.LLM_PROVIDER,
    },
  };

  // Get existing versions
  let versions = [];
  try {
    versions = (await kv.get(VERSIONS_KEY)) || [];
  } catch (error) {
    console.error('Failed to fetch versions from KV:', error);
  }

  // Add new version at the beginning (newest first)
  versions.unshift(version);

  // Save updated versions list
  await kv.set(VERSIONS_KEY, versions);

  return version;
}

/**
 * Get the full version history
 * @returns {array} Array of version objects
 */
export async function getVersionHistory() {
  try {
    const versions = (await kv.get(VERSIONS_KEY)) || [];
    return versions;
  } catch (error) {
    console.error('Failed to get version history from KV:', error);
    return [];
  }
}

/**
 * Delete a version by ID
 * @param {string} versionId - The version ID to delete
 * @returns {object} Result with success status
 */
export async function deleteVersion(versionId) {
  try {
    const versions = (await kv.get(VERSIONS_KEY)) || [];
    const index = versions.findIndex((v) => v.id === versionId);

    if (index === -1) {
      return { success: false, error: 'Version not found' };
    }

    versions.splice(index, 1);
    await kv.set(VERSIONS_KEY, versions);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete version from KV:', error);
    return { success: false, error: 'Failed to delete version' };
  }
}
