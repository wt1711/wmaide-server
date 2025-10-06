import express from 'express';
import { createConsultationPrompt_EN } from '../prompts.js';

const router = express.Router();

// Helper function to call OpenAI (will be passed from main app)
const createSuggestionRoute = (callOpenAI) => {
  router.post('/suggestion', async (req, res) => {
    const { context, selectedMessage, question } = req.body;

    if (!context) {
      return res.status(400).json({ error: 'Missing context' });
    }

    const prompt = createConsultationPrompt_EN(
      context,
      selectedMessage,
      question
    );

    const suggestion = await callOpenAI(res, prompt);
    if (suggestion) {
      res.json({ suggestion });
    }
  });

  return router;
};

export default createSuggestionRoute;
