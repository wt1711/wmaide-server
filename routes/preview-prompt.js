import express from 'express';

const router = express.Router();

const createPreviewPromptRoute = (callOpenAI) => {
  router.post('/preview-prompt', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    if (typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt must be a string' });
    }

    const response = await callOpenAI(res, prompt);
    if (response) {
      res.json({ response });
    }
  });

  return router;
};

export default createPreviewPromptRoute;
