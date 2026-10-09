import express from 'express';
import { processAdvancedQuery, ConversationManager, detectIntent } from '../services/advancedAI.js';

const router = express.Router();
const conversationManagers = new Map();
const supportedQueryTypes = new Set(['general', 'reasoning', 'search', 'factcheck', 'code-review', 'creative']);
const supportedModes = new Set(['quick', 'balanced', 'advanced']);

function normalizeMode(mode) {
  return supportedModes.has(mode) ? mode : 'balanced';
}

function getConversationManager(sessionId) {
  if (!conversationManagers.has(sessionId)) {
    conversationManagers.set(sessionId, new ConversationManager());
  }
  return conversationManagers.get(sessionId);
}

router.post('/query', async (req, res) => {
  try {
    const {
      prompt,
      sessionId = 'default',
      includeSearch = false,
      context = '',
      mode: requestedMode,
      queryType: requestedQueryType
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ ok: false, error: 'Prompt is required' });
    }

    const manager = getConversationManager(sessionId);
    const mode = normalizeMode(requestedMode);
    const queryType = supportedQueryTypes.has(requestedQueryType)
      ? requestedQueryType
      : detectIntent(prompt);
    const conversationHistory = manager.getContext();

    const result = await processAdvancedQuery({
      prompt,
      queryType,
      includeSearch: includeSearch || queryType === 'search',
      conversationHistory,
      context: context || manager.context,
      mode
    });

    manager.addMessage('user', prompt, { intent: queryType });
    manager.addMessage('assistant', result.response);

    return res.json(result);
  } catch (error) {
    console.error('Advanced query error', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/reason', async (req, res) => {
  try {
    const {
      prompt,
      context = '',
      sessionId = 'default',
      includeSearch = false,
      mode: requestedMode
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ ok: false, error: 'Prompt is required' });
    }

    const manager = getConversationManager(sessionId);
    const result = await processAdvancedQuery({
      prompt,
      queryType: 'reasoning',
      includeSearch,
      conversationHistory: manager.getContext(),
      context: context || manager.context,
      mode: normalizeMode(requestedMode)
    });

    manager.addMessage('user', prompt, { intent: 'reasoning' });
    manager.addMessage('assistant', result.response);

    return res.json(result);
  } catch (error) {
    console.error('Reasoning error', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/factcheck', async (req, res) => {
  try {
    const { statement, sessionId = 'default', includeSearch = false, context = '', mode: requestedMode } = req.body;

    if (!statement) {
      return res.status(400).json({ ok: false, error: 'Statement is required' });
    }

    const manager = getConversationManager(sessionId);
    const result = await processAdvancedQuery({
      prompt: statement,
      queryType: 'factcheck',
      includeSearch,
      conversationHistory: manager.getContext(),
      context: context || manager.context,
      mode: normalizeMode(requestedMode)
    });

    manager.addMessage('user', `Fact-check: ${statement}`);
    manager.addMessage('assistant', result.response);

    return res.json(result);
  } catch (error) {
    console.error('Fact-check error', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/conversation/:sessionId', (req, res) => {
  const manager = getConversationManager(req.params.sessionId);
  return res.json({ ok: true, conversation: manager.export() });
});

router.post('/conversation/:sessionId/clear', (req, res) => {
  const manager = getConversationManager(req.params.sessionId);
  manager.clear();
  return res.json({ ok: true, message: 'Conversation cleared' });
});

router.post('/conversation/:sessionId/context', (req, res) => {
  const { context } = req.body;
  const manager = getConversationManager(req.params.sessionId);
  manager.setCustomContext(context);
  return res.json({ ok: true, message: 'Context set' });
});

export default router;
