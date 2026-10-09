import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import aiRoutes from './routes/ai.js';
import systemRoutes from './routes/system.js';
import executionRoutes from './routes/execution.js';
import advancedRoutes from './routes/advanced.js';
import dataRoutes from './routes/data.js';
import { closeDatabase, initDatabase } from './db.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '127.0.0.1';

const allowedOrigins = new Set([
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

app.use((req, res, next) => {
  const origin = req.get('origin');
  const isElectronFileOrigin = origin === 'null' && /Electron\//.test(req.get('user-agent') || '');
  if (origin === 'null' && !isElectronFileOrigin) {
    return res.status(403).json({ error: 'This local data API does not allow opaque web origins.' });
  }
  return cors({
    origin: (requestOrigin, callback) => callback(
      null,
      !requestOrigin || allowedOrigins.has(requestOrigin) || isElectronFileOrigin
    )
  })(req, res, next);
});
app.use(express.json({ limit: '8mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'jarvis-ai-os-backend',
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/ai', aiRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/execution', executionRoutes);
app.use('/api/advanced', advancedRoutes);
app.use('/api/data', dataRoutes);
app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('API request failed:', error.message);
  return res.status(error.status || 500).json({
    error: error.status === 413 ? 'Request payload is too large.' : 'The local JARVIS request failed.'
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(clientId, ws);

  ws.on('message', (message) => {
    try {
      const payload = JSON.parse(String(message));
      if (payload.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (error) {
      console.warn('Invalid WS message:', error.message);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
  });

  ws.send(JSON.stringify({ type: 'connected', clientId }));
});

export function broadcastSocket(message) {
  const payload = JSON.stringify(message);
  for (const socket of clients.values()) {
    if (socket.readyState === 1) socket.send(payload);
  }
}

try {
  await initDatabase();
  server.listen(port, host, () => {
    console.log(`JARVIS AI OS backend running at http://${host}:${port}`);
    console.log('WebSocket endpoint ready at ws://localhost:4000/ws');
  });
} catch (error) {
  console.error('Could not initialize the local JARVIS database:', error);
  process.exitCode = 1;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    const closeStorage = () => closeDatabase().catch(error => {
      console.error('Could not close the local JARVIS database cleanly:', error);
      process.exitCode = 1;
    });
    if (server.listening) server.close(closeStorage);
    else closeStorage();
  });
}
