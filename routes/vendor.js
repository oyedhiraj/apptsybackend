const express = require('express');
const router = express.Router();

// Dummy in-memory status (for demo)
let vendorStatus = {
  VENDOR_001: 'available'
};

// GET status
router.get('/status/:vendorId', (req, res) => {
  const vendorId = req.params.vendorId;
  const status = vendorStatus[vendorId] || 'available';
  res.json({ vendorId, status });
});

// POST set status
router.post('/status', (req, res) => {
  const { vendorId, status } = req.body;
  vendorStatus[vendorId] = status;
  res.json({ vendorId, status });
});

module.exports = router;
