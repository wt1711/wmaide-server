import { Router } from 'express';
import { createRomanticResponsePrompt_EN } from '../../prompts.js';
import { generateResponse } from '../services/llmService.js';

const router = Router();

router.post('/generate-response', async (req, res) => {
  const requestStartTime = Date.now();
  console.log('📝 Starting /api/generate-response request at:', new Date().toISOString());

  const { context, message, spec } = req.body;

  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  try {
    const prompt = await createRomanticResponsePrompt_EN(context, message, spec);
    const result = await generateResponse(prompt);

    const requestEndTime = Date.now();
    const totalDuration = requestEndTime - requestStartTime;
    console.log(`🎯 Total request time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);

    // Handle error response from provider
    if (result.error) {
      return res.status(result.status || 500).json({
        error: result.error,
        provider: result.provider,
        timing: {
          totalDuration,
          totalDurationSeconds: (totalDuration / 1000).toFixed(2),
        },
      });
    }

    res.json({
      response: result.text || 'Cannot get response from LLM',
      usage: result.usage,
      provider: result.provider,
      timing: {
        totalDuration,
        totalDurationSeconds: (totalDuration / 1000).toFixed(2),
        providerDuration: result.durationMs,
      },
    });
  } catch (error) {
    console.error('Failed to generate response:', error);
    res.status(500).json({ error: 'Error from LLM provider' });
  }
});

export default router;
