import { Router } from 'express';
import {
  saveNewVersion,
  getVersionHistory,
  deleteVersion,
} from '../../promptVersionController.js';

const router = Router();

// POST /versions/save - Save current config as a new version snapshot
router.post('/save', async (req, res) => {
  try {
    const { description, configData } = req.body;
    const version = await saveNewVersion(configData, description || '');
    res.json({ success: true, version });
  } catch (error) {
    console.error('Failed to save new version:', error);
    res.status(500).json({ error: 'Failed to save new version' });
  }
});

// GET /versions/history - Get version history
router.get('/history', async (req, res) => {
  try {
    const versions = await getVersionHistory();
    res.json(versions);
  } catch (error) {
    console.error('Failed to get version history:', error);
    res.status(500).json({ error: 'Failed to get version history' });
  }
});

// DELETE /versions/:id - Delete a version
router.delete('/:id', async (req, res) => {
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

export default router;
