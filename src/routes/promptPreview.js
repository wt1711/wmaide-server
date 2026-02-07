import { Router } from 'express';
import { kv } from '@vercel/kv';
import { KV_KEYS } from '../config/index.js';

const router = Router();

/**
 * GET /api/log-prompt
 * Returns the current LOG_PROMPT flag status
 */
router.get('/log-prompt', async (req, res) => {
  try {
    const enabled = await kv.get(KV_KEYS.logPrompt);
    res.json({ enabled: !!enabled });
  } catch (error) {
    console.error('Failed to get LOG_PROMPT:', error);
    res.status(500).json({ error: 'Failed to get LOG_PROMPT status' });
  }
});

/**
 * POST /api/log-prompt
 * Toggle or set the LOG_PROMPT flag
 */
router.post('/log-prompt', async (req, res) => {
  try {
    const { enabled } = req.body;
    await kv.set(KV_KEYS.logPrompt, !!enabled);
    res.json({ enabled: !!enabled });
  } catch (error) {
    console.error('Failed to set LOG_PROMPT:', error);
    res.status(500).json({ error: 'Failed to set LOG_PROMPT' });
  }
});

/**
 * GET /api/full-prompt-preview
 * Returns the latest stored full prompt from KV
 */
router.get('/full-prompt-preview', async (req, res) => {
  try {
    const data = await kv.get(KV_KEYS.currentFullPrompt);

    if (!data) {
      return res.json({
        prompt: null,
        message: 'No prompt stored yet. Generate a response to see.',
      });
    }

    res.json({
      prompt: data.prompt,
      output: data.output || null,
      timestamp: data.timestamp,
      originalMessage: data.message,
      idea: data.idea || null,
      provider: data.provider || null,
    });
  } catch (error) {
    console.error('Failed to get latest prompt:', error);
    res.status(500).json({ error: 'Failed to get latest prompt' });
  }
});

/**
 * GET /api/current-analysis
 * Returns the latest stored analysis from KV
 */
router.get('/current-analysis', async (req, res) => {
  try {
    const data = await kv.get(KV_KEYS.currentAnalysis);

    if (!data) {
      return res.json({
        analysis: null,
        message: 'No analysis stored yet. Generate a response to see.',
      });
    }

    res.json({
      analysis: data.analysis,
      timestamp: data.timestamp,
    });
  } catch (error) {
    console.error('Failed to get analysis:', error);
    res.status(500).json({ error: 'Failed to get analysis' });
  }
});

export default router;
