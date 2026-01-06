const express = require('express');
const router = express.Router();

// POST /api/member/add
router.post('/add', (req, res) => {
  const { name, age, number, address, service } = req.body;

  // Simple validation
  if (!name || !age || !number || !address || !service) {
    return res.status(400).json({ 
      success: false, 
      message: 'All fields are required' 
    });
  }

  // Here you can save to database
  console.log('Member received:', req.body);

  return res.status(200).json({
    success: true,
    message: 'Member added successfully',
    data: req.body
  });
});

module.exports = router;
