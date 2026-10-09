import express from 'express';
import { randomUUID } from 'node:crypto';
import {
  addMemory,
  deleteConversation,
  deleteMemory,
  deleteUploadedFile,
  getPreferences,
  getUploadedFile,
  listConversations,
  listMemories,
  listUploadedFiles,
  saveConversations,
  savePreferences,
  saveUploadedFile
} from '../db.js';

const router = express.Router();
const maximumFileSize = 5 * 1024 * 1024;
const maximumTotalFileSize = 100 * 1024 * 1024;
const supportedPreferences = new Set(['responseMode', 'queryType', 'includeSearch']);

function isValidId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
}

function isValidConversation(conversation) {
  return conversation
    && isValidId(conversation.id)
    && typeof conversation.title === 'string'
    && conversation.title.length <= 500
    && Array.isArray(conversation.messages)
    && conversation.messages.length <= 500
    && conversation.messages.every(message =>
      message
      && typeof message.role === 'string'
      && typeof message.content === 'string'
      && message.content.length <= 100000
    );
}

function sanitizeFilename(name) {
  const baseName = String(name).split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (baseName || 'upload').slice(0, 255);
}

router.get('/', async (_req, res, next) => {
  try {
    const [chats, preferences, memories, files] = await Promise.all([
      listConversations(),
      getPreferences(),
      listMemories(),
      listUploadedFiles()
    ]);
    return res.json({ chats, preferences, memories, files });
  } catch (error) {
    return next(error);
  }
});

router.get('/chats', async (_req, res, next) => {
  try {
    return res.json({ chats: await listConversations() });
  } catch (error) {
    return next(error);
  }
});

router.put('/chats', async (req, res, next) => {
  try {
    const { chats } = req.body;
    if (!Array.isArray(chats) || chats.length > 50 || !chats.every(isValidConversation)) {
      return res.status(400).json({ error: 'Provide up to 50 valid conversations.' });
    }
    await saveConversations(chats);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/chats/import', async (req, res, next) => {
  try {
    const { chats } = req.body;
    if (!Array.isArray(chats) || chats.length > 50 || !chats.every(isValidConversation)) {
      return res.status(400).json({ error: 'Provide up to 50 valid conversations.' });
    }
    if ((await listConversations()).length > 0) {
      return res.status(409).json({ error: 'Local chat history already exists; import was not applied.' });
    }
    await saveConversations(chats);
    return res.status(201).json({ ok: true, imported: chats.length });
  } catch (error) {
    return next(error);
  }
});

router.delete('/chats/:id', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid conversation id.' });
    await deleteConversation(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.put('/preferences', async (req, res, next) => {
  try {
    const entries = Object.entries(req.body || {});
    if (entries.length > supportedPreferences.size || entries.some(([key]) => !supportedPreferences.has(key))) {
      return res.status(400).json({ error: 'One or more preference keys are not supported.' });
    }
    if (entries.some(([, value]) => !['string', 'boolean'].includes(typeof value))) {
      return res.status(400).json({ error: 'Preferences must be strings or booleans.' });
    }
    await savePreferences(Object.fromEntries(entries));
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/memories', async (_req, res, next) => {
  try {
    return res.json({ memories: await listMemories() });
  } catch (error) {
    return next(error);
  }
});

router.post('/memories', async (req, res, next) => {
  try {
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > 2000) {
      return res.status(400).json({ error: 'A memory must contain 1 to 2,000 characters.' });
    }
    const memory = await addMemory(randomUUID(), content);
    return res.status(201).json({ memory });
  } catch (error) {
    return next(error);
  }
});

router.delete('/memories/:id', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid memory id.' });
    await deleteMemory(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/files', async (_req, res, next) => {
  try {
    return res.json({ files: await listUploadedFiles() });
  } catch (error) {
    return next(error);
  }
});

router.post('/files', async (req, res, next) => {
  try {
    const { name, mimeType, contentBase64 } = req.body || {};
    if (typeof name !== 'string' || typeof contentBase64 !== 'string'
      || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)) {
      return res.status(400).json({ error: 'Provide a file name and valid base64 file content.' });
    }

    const content = Buffer.from(contentBase64, 'base64');
    if (content.length > maximumFileSize) {
      return res.status(413).json({ error: 'Files cannot exceed 5 MB.' });
    }

    const currentFiles = await listUploadedFiles();
    const storedSize = currentFiles.reduce((total, file) => total + file.size, 0);
    if (storedSize + content.length > maximumTotalFileSize) {
      return res.status(413).json({ error: 'Local file storage is limited to 100 MB. Delete files to free space.' });
    }

    const id = randomUUID();
    await saveUploadedFile({
      id,
      name: sanitizeFilename(name),
      mimeType: typeof mimeType === 'string' && mimeType.length <= 255 ? mimeType : 'application/octet-stream',
      content
    });
    return res.status(201).json({ file: { id, name: sanitizeFilename(name), size: content.length } });
  } catch (error) {
    return next(error);
  }
});

router.get('/files/:id', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid file id.' });
    const file = await getUploadedFile(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found.' });

    const encodedName = encodeURIComponent(file.name).replace(/['()!*]/g, character =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    );
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': file.size,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
      'X-Content-Type-Options': 'nosniff'
    });
    return res.send(file.content);
  } catch (error) {
    return next(error);
  }
});

router.delete('/files/:id', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid file id.' });
    await deleteUploadedFile(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
