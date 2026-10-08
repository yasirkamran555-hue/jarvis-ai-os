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

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

server.listen(port, host, () => {
  console.log(`JARVIS AI OS backend running at http://${host}:${port}`);
  console.log('WebSocket endpoint ready at ws://localhost:4000/ws');
});
