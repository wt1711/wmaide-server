import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import {
  createRomanticResponsePrompt_EN,
} from './prompts.js';
import createGradeRoute from './routes/grade.js';
import createSuggestionRoute from './routes/suggestion.js';
import createGenerateResponse2Route from './routes/generate-response2.js';

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

// Mount grade routes
app.use('/api', createGradeRoute(callOpenAI));

// Mount suggestion routes
app.use('/api', createSuggestionRoute(callOpenAI));

// Mount generate-response2 routes
app.use('/api', createGenerateResponse2Route(callOpenAI));



app.post('/api/generate-response', async (req, res) => {
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


export default app;

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
