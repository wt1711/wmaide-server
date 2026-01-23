import { Router } from 'express';
import { kv } from '@vercel/kv';
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_RESPONSE_CRITERIA,
  DEFAULT_ANALYZE_INTENT_PROMPT,
  DEFAULT_GENERATE_FROM_DIRECTION_PROMPT,
  DEFAULT_GRADE_OWN_MESSAGE_PROMPT,
  DEFAULT_SUGGESTION_PROMPT,
} from '../prompts/index.js';
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

// Analyze Intent Prompt API
router.get('/analyze-intent-prompt', async (req, res) => {
  try {
    const prompt = await kv.get(KV_KEYS.analyzeIntentPrompt);
    res.json({ prompt: prompt || DEFAULT_ANALYZE_INTENT_PROMPT });
  } catch (error) {
    console.error('Failed to fetch ANALYZE_INTENT_PROMPT from KV:', error);
    res.json({ prompt: DEFAULT_ANALYZE_INTENT_PROMPT });
  }
});

router.post('/analyze-intent-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (prompt === undefined) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    await kv.set(KV_KEYS.analyzeIntentPrompt, prompt);
    configCache.invalidate();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save ANALYZE_INTENT_PROMPT to KV:', error);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

// Generate From Direction Prompt API
router.get('/generate-from-direction-prompt', async (req, res) => {
  try {
    const prompt = await kv.get(KV_KEYS.generateFromDirectionPrompt);
    res.json({ prompt: prompt || DEFAULT_GENERATE_FROM_DIRECTION_PROMPT });
  } catch (error) {
    console.error('Failed to fetch GENERATE_FROM_DIRECTION_PROMPT from KV:', error);
    res.json({ prompt: DEFAULT_GENERATE_FROM_DIRECTION_PROMPT });
  }
});

router.post('/generate-from-direction-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (prompt === undefined) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    await kv.set(KV_KEYS.generateFromDirectionPrompt, prompt);
    configCache.invalidate();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save GENERATE_FROM_DIRECTION_PROMPT to KV:', error);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

// Grade Own Message Prompt API
router.get('/grade-own-message-prompt', async (req, res) => {
  try {
    const prompt = await kv.get(KV_KEYS.gradeOwnMessagePrompt);
    res.json({ prompt: prompt || DEFAULT_GRADE_OWN_MESSAGE_PROMPT });
  } catch (error) {
    console.error('Failed to fetch GRADE_OWN_MESSAGE_PROMPT from KV:', error);
    res.json({ prompt: DEFAULT_GRADE_OWN_MESSAGE_PROMPT });
  }
});

router.post('/grade-own-message-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (prompt === undefined) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    await kv.set(KV_KEYS.gradeOwnMessagePrompt, prompt);
    configCache.invalidate();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save GRADE_OWN_MESSAGE_PROMPT to KV:', error);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

// Latest Analyze Intent Full Prompt API
router.get('/latest-analyze-intent-prompt', async (req, res) => {
  try {
    const data = await kv.get(KV_KEYS.latestAnalyzeIntentPrompt);
    if (data) {
      res.json(data);
    } else {
      res.json({ message: 'No prompt stored yet. Call the /api/analyze-intent endpoint first.' });
    }
  } catch (error) {
    console.error('Failed to fetch latest analyze intent prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Latest Generate From Direction Full Prompt API
router.get('/latest-generate-from-direction-prompt', async (req, res) => {
  try {
    const data = await kv.get(KV_KEYS.latestGenerateFromDirectionPrompt);
    if (data) {
      res.json(data);
    } else {
      res.json({ message: 'No prompt stored yet. Call the /api/generate-from-direction endpoint first.' });
    }
  } catch (error) {
    console.error('Failed to fetch latest generate from direction prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Latest Grade Own Message Full Prompt API
router.get('/latest-grade-own-message-prompt', async (req, res) => {
  try {
    const data = await kv.get(KV_KEYS.latestGradeOwnMessagePrompt);
    if (data) {
      res.json(data);
    } else {
      res.json({ message: 'No prompt stored yet. Call the /api/grade-own-message endpoint first.' });
    }
  } catch (error) {
    console.error('Failed to fetch latest grade own message prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Suggestion Prompt API
router.get('/suggestion-prompt', async (req, res) => {
  try {
    const prompt = await kv.get(KV_KEYS.suggestionPrompt);
    res.json({ prompt: prompt || DEFAULT_SUGGESTION_PROMPT });
  } catch (error) {
    console.error('Failed to fetch SUGGESTION_PROMPT from KV:', error);
    res.json({ prompt: DEFAULT_SUGGESTION_PROMPT });
  }
});

router.post('/suggestion-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (prompt === undefined) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    await kv.set(KV_KEYS.suggestionPrompt, prompt);
    configCache.invalidate();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save SUGGESTION_PROMPT to KV:', error);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

// Latest Suggestion Full Prompt API
router.get('/latest-suggestion-prompt', async (req, res) => {
  try {
    const data = await kv.get(KV_KEYS.latestSuggestionPrompt);
    if (data) {
      res.json(data);
    } else {
      res.json({ message: 'No prompt stored yet. Call the /api/suggestion endpoint first.' });
    }
  } catch (error) {
    console.error('Failed to fetch latest suggestion prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Available Models API
router.get('/models', (req, res) => {
  res.json(PROVIDERS);
});

export default router;
