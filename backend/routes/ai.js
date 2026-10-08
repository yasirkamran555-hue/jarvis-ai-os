import express from 'express';
import { routeAIRequest } from '../services/router.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { prompt, context = '', mode = 'local', selectedModel } = req.body;

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const result = await routeAIRequest({
      prompt: String(prompt),
      context: String(context || ''),
      mode,
      selectedModel
    });

    return res.json(result);
  } catch (error) {
    console.error('AI route error:', error);
    return res.status(500).json({ error: error.message || 'AI request failed.' });
  }
});

export default router;
