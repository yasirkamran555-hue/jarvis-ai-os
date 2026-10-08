import express from 'express';
import { checkForUpdates, installUpdate, getUpdateStatus } from '../services/updateManager.js';

const router = express.Router();

// Check for available updates
router.get('/check', async (req, res) => {
  try {
    const updates = await checkForUpdates();
    return res.json({
      hasUpdates: updates.length > 0,
      updates,
      timestamp: new Date()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get current update status
router.get('/status', async (req, res) => {
  try {
    const status = await getUpdateStatus();
    return res.json(status);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Request approval for an update
router.post('/request-approval', async (req, res) => {
  try {
    const { updateId, updateType, description, features } = req.body;

    if (!updateId || !updateType) {
      return res.status(400).json({ error: 'Missing updateId or updateType' });
    }

    // Broadcast approval request to all connected WebSocket clients
    const approval = {
      id: updateId,
      type: updateType,
      description,
      features,
      requestedAt: new Date(),
      status: 'pending'
    };

    return res.json({
      message: 'Approval request sent to admin panel',
      approval
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Approve an update
router.post('/approve', async (req, res) => {
  try {
    const { updateId, userId } = req.body;

    if (!updateId) {
      return res.status(400).json({ error: 'Missing updateId' });
    }

    const result = await installUpdate(updateId);
    return res.json({
      message: 'Update approved and installation started',
      result,
      approvedBy: userId,
      approvedAt: new Date()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Reject an update
router.post('/reject', async (req, res) => {
  try {
    const { updateId, reason, userId } = req.body;

    if (!updateId) {
      return res.status(400).json({ error: 'Missing updateId' });
    }

    return res.json({
      message: 'Update rejected',
      updateId,
      rejectedBy: userId,
      reason,
      rejectedAt: new Date()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get update history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    // This would fetch from database in real implementation
    return res.json({
      history: [],
      total: 0,
      limit
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
