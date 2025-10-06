import express from 'express';
import { createGradeResponsePrompt_EN } from '../prompts.js';

const router = express.Router();

// Helper function to call OpenAI (will be passed from main app)
const createGradeRoute = (callOpenAI) => {
  router.post('/grade-response', async (req, res) => {
    const { context, response } = req.body;

    if (!context) {
      return res.status(400).json({ error: 'Missing context' });
    }

    if (!response) {
      return res.status(400).json({ error: 'Missing response to grade' });
    }

    const prompt = createGradeResponsePrompt_EN(context, response);
    const gradeText = await callOpenAI(res, prompt, '0');

    if (gradeText) {
      const grade = parseInt(gradeText.trim(), 10);
      if (isNaN(grade)) {
        res.json({ grade: 0 });
      } else {
        res.json({ grade });
      }
    }
  });

  return router;
};

export default createGradeRoute;
