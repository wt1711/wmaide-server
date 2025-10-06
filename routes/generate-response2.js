import express from 'express';
import { createRomanticResponsePrompt_EN } from '../prompts.js';

const router = express.Router();

// Helper function to call OpenAI (will be passed from main app)
const createGenerateResponse2Route = (callOpenAI) => {
  router.post('/generate-response2', async (req, res) => {
    const { context, message, spec } = req.body;

    if (!context) {
      return res.status(400).json({ error: 'Missing context' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    const prompt = createRomanticResponsePrompt_EN(context, message, spec);
    const romanticResponse = await callOpenAI(
      res,
      prompt,
    );
    if (romanticResponse) {
      res.json({ response: romanticResponse });
    }
  });

  return router;
};

export default createGenerateResponse2Route;
