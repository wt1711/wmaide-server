import { Router } from 'express';
import { createGradeResponsePrompt_EN } from '../prompts/index.js';
import { generateResponse } from '../services/llmService.js';

const router = Router();

router.post('/grade-response', async (req, res) => {
  const { context, response } = req.body;

  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  if (!response) {
    return res.status(400).json({ error: 'Missing response to grade' });
  }

  try {
    const prompt = createGradeResponsePrompt_EN(context, response);
    const result = await generateResponse(prompt);

    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }

    const gradeText = result.text || '0';
    const grade = parseInt(gradeText.trim(), 10);
    res.json({ grade: isNaN(grade) ? 0 : grade });
  } catch (error) {
    console.error('Failed to grade response:', error);
    res.status(500).json({ error: 'Error from LLM provider' });
  }
});

export default router;
