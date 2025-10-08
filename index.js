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
  const startTime = Date.now();
  console.log('🚀 Starting OpenAI API call at:', new Date().toISOString());
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`✅ OpenAI API call completed in ${duration}ms (${(duration/1000).toFixed(2)}s)`);
    
    return response.choices[0].message.content || defaultResponse;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.error(`❌ OpenAI API call failed after ${duration}ms (${(duration/1000).toFixed(2)}s):`, error);
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
  const requestStartTime = Date.now();
  console.log('📝 Starting /api/generate-response request at:', new Date().toISOString());
  
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
    const requestEndTime = Date.now();
    const totalDuration = requestEndTime - requestStartTime;
    console.log(`🎯 Total request time: ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s)`);
    res.json({ 
      response: romanticResponse,
      timing: {
        totalDuration: totalDuration,
        totalDurationSeconds: (totalDuration/1000).toFixed(2)
      }
    });
  }
});


export default app;

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
