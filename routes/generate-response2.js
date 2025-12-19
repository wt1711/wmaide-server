import { Router } from 'express';
import { createRomanticResponsePrompt_EN } from '../prompts.js';
import { generateResponse } from '../src/services/llmService.js';

const router = Router();

router.post('/generate-response2', async (req, res) => {
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

    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }

    res.json({ response: result.text || '' });
  } catch (error) {
    console.error('Failed to generate response:', error);
    res.status(500).json({ error: 'Error from LLM provider' });
  }
});

export default router;
