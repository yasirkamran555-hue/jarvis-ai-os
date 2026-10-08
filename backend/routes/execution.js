import express from 'express';
import { runCodeInSandbox } from '../services/dockerSandbox.js';

const router = express.Router();

router.post('/run', async (req, res) => {
  try {
    const { language = 'bash', code = '', timeoutMs = Number(process.env.SANDBOX_TIMEOUT_MS || 20000) } = req.body;

    if (!code || !String(code).trim()) {
      return res.status(400).json({ error: 'Code is required.' });
    }

    const result = await runCodeInSandbox({ language, code, timeoutMs });
    return res.json(result);
  } catch (error) {
    console.error('Execution error:', error);
    return res.status(500).json({ error: error.message || 'Code execution failed.' });
  }
});

export default router;
