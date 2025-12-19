import { Router } from 'express';
import { createConsultationPrompt_EN } from '../prompts/index.js';
import { generateResponse } from '../services/llmService.js';

const router = Router();

router.post('/suggestion', async (req, res) => {
  const { context, selectedMessage, question } = req.body;

  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  try {
    const prompt = createConsultationPrompt_EN(context, selectedMessage, question);
    const result = await generateResponse(prompt);

    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }

    res.json({ suggestion: result.text || '' });
  } catch (error) {
    console.error('Failed to generate suggestion:', error);
    res.status(500).json({ error: 'Error from LLM provider' });
  }
});

export default router;
