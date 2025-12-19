import { Router } from 'express';
import { generateResponse } from '../services/llmService.js';

const router = Router();

router.post('/preview-prompt', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  if (typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt must be a string' });
  }

  try {
    const result = await generateResponse(prompt);

    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }

    res.json({ response: result.text || '' });
  } catch (error) {
    console.error('Failed to preview prompt:', error);
    res.status(500).json({ error: 'Error from LLM provider' });
  }
});

export default router;
