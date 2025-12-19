import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Route imports
import gradeRouter from './src/routes/grade.js';
import suggestionRouter from './src/routes/suggestion.js';
import previewPromptRouter from './src/routes/previewPrompt.js';
import configRouter from './src/routes/config.js';
import versionsRouter from './src/routes/versions.js';
import generateRouter from './src/routes/generate.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api', gradeRouter);
app.use('/api', suggestionRouter);
app.use('/api', previewPromptRouter);
app.use('/api', configRouter);
app.use('/api/versions', versionsRouter);
app.use('/api', generateRouter);

// Static file routes
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

export default app;

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
