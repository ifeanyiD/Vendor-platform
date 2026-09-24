const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getSummary } = require('../services/analyticsService');
const Analytics = require('../models/Analytics');

// @GET /api/analytics/summary?days=30
router.get('/summary', protect, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const summary = await getSummary(req.vendor._id, days);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/analytics/today
router.get('/today', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const record = await Analytics.findOne({ vendor: req.vendor._id, date: today });
    res.json(record || { storeViews: 0, whatsappTaps: 0, productTaps: {} });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
