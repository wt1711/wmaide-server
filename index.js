import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import {
  createConsultationPrompt_EN,
  createGradeResponsePrompt_EN,
  createRomanticResponsePrompt_EN,
} from './prompts.js';

dotenv.config();

const app = express();
const port = 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

const callOpenAI = async (res, prompt, defaultResponse = 'Cannot get response from OpenAI') => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0].message.content || defaultResponse;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    res.status(500).json({ error: 'Error from OpenAI' });
    return null;
  }
};

app.post('/api/suggestion', async (req, res) => {
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

app.post('/api/generate-response', async (req, res) => {
  const { context, message, tone } = req.body;

  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  const prompt = createRomanticResponsePrompt_EN(context, message, tone);
  const romanticResponse = await callOpenAI(
    res,
    prompt,
  );
  if (romanticResponse) {
    res.json({ response: romanticResponse });
  }
});

app.post('/api/grade-response', async (req, res) => {
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

export default app;

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
