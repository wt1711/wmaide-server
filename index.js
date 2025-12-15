import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { kv } from '@vercel/kv';
import {
  createRomanticResponsePrompt_EN,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_RESPONSE_CRITERIA,
} from './prompts.js';
import {
  saveNewVersion,
  getVersionHistory,
  deleteVersion,
} from './promptVersionController.js';
import createGradeRoute from './routes/grade.js';
import createSuggestionRoute from './routes/suggestion.js';
import createGenerateResponse2Route from './routes/generate-response2.js';
import createPreviewPromptRoute from './routes/preview-prompt.js';

dotenv.config();

const app = express();
const port = 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const callOpenAI = async (res, prompt, defaultResponse = 'Cannot get response from OpenAI') => {
  const startTime = Date.now();
  console.log('🚀 Starting OpenAI API call at:', new Date().toISOString());

  // Fetch model from KV, default to gpt-4o
  let model = 'gpt-4o';
  try {
    const kvModel = await kv.get('LLM_MODEL_NAME');
    if (kvModel) {
      model = kvModel;
    }
  } catch (kvError) {
    console.error('Failed to fetch LLM_MODEL_NAME from KV, using default:', kvError);
  }
  console.log(`📦 Using model: ${model}`);

  try {
    const response = await openai.chat.completions.create({
      model,
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

// Mount preview-prompt routes
app.use('/api', createPreviewPromptRoute(callOpenAI));

// ============ Individual Config APIs ============

// System Prompt API
app.get('/api/system-prompt', async (req, res) => {
  try {
    const prompt = await kv.get('SYSTEM_PROMPT');
    res.json({ prompt: prompt || DEFAULT_SYSTEM_PROMPT });
  } catch (error) {
    console.error('Failed to fetch SYSTEM_PROMPT from KV:', error);
    res.json({ prompt: DEFAULT_SYSTEM_PROMPT });
  }
});

app.post('/api/system-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (prompt === undefined) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    await kv.set('SYSTEM_PROMPT', prompt);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save SYSTEM_PROMPT to KV:', error);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

// LLM Model API
const DEFAULT_LLM_MODEL = 'gpt-4o';

app.get('/api/llm-model', async (req, res) => {
  try {
    const modelName = await kv.get('LLM_MODEL_NAME');
    res.json({ modelName: modelName || DEFAULT_LLM_MODEL });
  } catch (error) {
    console.error('Failed to fetch LLM_MODEL_NAME from KV:', error);
    res.json({ modelName: DEFAULT_LLM_MODEL });
  }
});

app.post('/api/llm-model', async (req, res) => {
  try {
    const { modelName } = req.body;
    if (modelName === undefined) {
      return res.status(400).json({ error: 'Missing modelName' });
    }
    await kv.set('LLM_MODEL_NAME', modelName);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save LLM_MODEL_NAME to KV:', error);
    res.status(500).json({ error: 'Failed to save model name' });
  }
});

// Response Criteria API
app.get('/api/response-criteria', async (req, res) => {
  try {
    const prompt = await kv.get('RESPONSE_CRITERIA');
    res.json({ prompt: prompt || DEFAULT_RESPONSE_CRITERIA });
  } catch (error) {
    console.error('Failed to fetch RESPONSE_CRITERIA from KV:', error);
    res.json({ prompt: DEFAULT_RESPONSE_CRITERIA });
  }
});

app.post('/api/response-criteria', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (prompt === undefined) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    await kv.set('RESPONSE_CRITERIA', prompt);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save RESPONSE_CRITERIA to KV:', error);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

// ============ Version Snapshot API ============

// POST /api/versions/save - Save current config as a new version snapshot
app.post('/api/versions/save', async (req, res) => {
  try {
    const { description, configData } = req.body;

    const version = await saveNewVersion(configData, description || '');
    res.json({ success: true, version });
  } catch (error) {
    console.error('Failed to save new version:', error);
    res.status(500).json({ error: 'Failed to save new version' });
  }
});

// GET /api/versions/history - Get version history
app.get('/api/versions/history', async (req, res) => {
  try {
    const versions = await getVersionHistory();
    res.json(versions);
  } catch (error) {
    console.error('Failed to get version history:', error);
    res.status(500).json({ error: 'Failed to get version history' });
  }
});

// DELETE /api/versions/:id - Delete a version
app.delete('/api/versions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteVersion(id);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete version:', error);
    res.status(500).json({ error: 'Failed to delete version' });
  }
});

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

  const prompt = await createRomanticResponsePrompt_EN(context, message, spec);
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

app.get('/admin.html', (req, res) => {
    // This tells the server exactly where the file is located and serves it.
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});


export default app;

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
