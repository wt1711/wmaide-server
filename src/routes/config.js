import { Router } from 'express';
import { kv } from '@vercel/kv';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_RESPONSE_CRITERIA } from '../prompts/index.js';
import { DEFAULTS, KV_KEYS } from '../config/index.js';
import { PROVIDERS } from '../config/models.js';
import configCache from '../services/configCache.js';

const router = Router();

// System Prompt API
router.get('/system-prompt', async (req, res) => {
  try {
    const prompt = await kv.get(KV_KEYS.systemPrompt);
    res.json({ prompt: prompt || DEFAULT_SYSTEM_PROMPT });
  } catch (error) {
    console.error('Failed to fetch SYSTEM_PROMPT from KV:', error);
    res.json({ prompt: DEFAULT_SYSTEM_PROMPT });
  }
});

router.post('/system-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (prompt === undefined) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    await kv.set(KV_KEYS.systemPrompt, prompt);
    configCache.invalidate();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save SYSTEM_PROMPT to KV:', error);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

// LLM Model API
router.get('/llm-model', async (req, res) => {
  try {
    const modelName = await kv.get(KV_KEYS.llmModelName);
    res.json({ modelName: modelName || DEFAULTS.llmModel });
  } catch (error) {
    console.error('Failed to fetch LLM_MODEL_NAME from KV:', error);
    res.json({ modelName: DEFAULTS.llmModel });
  }
});

router.post('/llm-model', async (req, res) => {
  try {
    const { modelName } = req.body;
    if (modelName === undefined) {
      return res.status(400).json({ error: 'Missing modelName' });
    }
    await kv.set(KV_KEYS.llmModelName, modelName);
    configCache.invalidate();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save LLM_MODEL_NAME to KV:', error);
    res.status(500).json({ error: 'Failed to save model name' });
  }
});

// LLM Provider API
router.get('/llm-provider', async (req, res) => {
  try {
    const provider = await kv.get(KV_KEYS.llmProvider);
    res.json({ provider: provider || DEFAULTS.llmProvider });
  } catch (error) {
    console.error('Failed to fetch LLM_PROVIDER from KV:', error);
    res.json({ provider: DEFAULTS.llmProvider });
  }
});

router.post('/llm-provider', async (req, res) => {
  try {
    const { provider } = req.body;
    if (provider === undefined) {
      return res.status(400).json({ error: 'Missing provider' });
    }
    await kv.set(KV_KEYS.llmProvider, provider);
    configCache.invalidate();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save LLM_PROVIDER to KV:', error);
    res.status(500).json({ error: 'Failed to save provider' });
  }
});

// Response Criteria API
router.get('/response-criteria', async (req, res) => {
  try {
    const prompt = await kv.get(KV_KEYS.responseCriteria);
    res.json({ prompt: prompt || DEFAULT_RESPONSE_CRITERIA });
  } catch (error) {
    console.error('Failed to fetch RESPONSE_CRITERIA from KV:', error);
    res.json({ prompt: DEFAULT_RESPONSE_CRITERIA });
  }
});

router.post('/response-criteria', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (prompt === undefined) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    await kv.set(KV_KEYS.responseCriteria, prompt);
    configCache.invalidate();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save RESPONSE_CRITERIA to KV:', error);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

// Available Models API
router.get('/models', (req, res) => {
  res.json(PROVIDERS);
});

export default router;
