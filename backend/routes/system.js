import express from 'express';
import os from 'node:os';
import { exec } from 'node:child_process';

const router = express.Router();

function getSystemSnapshot() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    cpu: os.cpus()[0]?.model || 'Unknown CPU',
    memory: {
      total: `${(totalMem / 1024 / 1024 / 1024).toFixed(1)} GB`,
      free: `${(freeMem / 1024 / 1024 / 1024).toFixed(1)} GB`,
      used: `${(usedMem / 1024 / 1024 / 1024).toFixed(1)} GB`
    },
    loadAverage: os.loadavg(),
    containers: [
      { name: 'ollama', status: 'online', type: 'local-model-engine' },
      { name: 'n8n', status: 'stopped', type: 'automation' }
    ]
  };
}

router.get('/status', (req, res) => {
  res.json(getSystemSnapshot());
});

router.get('/devices', (req, res) => {
  res.json({
    devices: [
      { id: 'lamp-1', name: 'Desk Lamp', type: 'switch', state: 'off' },
      { id: 'fan-1', name: 'Ceiling Fan', type: 'switch', state: 'on' },
      { id: 'sensor-1', name: 'Office Temp Sensor', type: 'sensor', state: '22C' }
    ]
  });
});

router.post('/devices/:id/trigger', (req, res) => {
  const { action = 'toggle' } = req.body;
  res.json({
    success: true,
    deviceId: req.params.id,
    action,
    status: action === 'on' ? 'enabled' : 'disabled'
  });
});

router.get('/docker', (req, res) => {
  exec('docker ps --format "table {{.Names}}\t{{.Status}}"', (error, stdout, stderr) => {
    if (error) {
      return res.json({
        ok: false,
        containers: [],
        error: stderr || error.message
      });
    }

    const lines = stdout.trim().split('\n').slice(1);
    const containers = lines
      .filter(Boolean)
      .map((line) => {
        const [name, status] = line.split(/\s{2,}/);
        return { name, status };
      });

    return res.json({ ok: true, containers });
  });
});

export default router;
