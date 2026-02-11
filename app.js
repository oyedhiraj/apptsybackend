const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// MIDDLEWARE
// ========================
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========================
// SWAGGER DOCUMENTATION
// ========================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true
  }
}));

// ========================
// DATABASE CONNECTION
// ========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ========================
// MODELS
// ========================
const User = require('./model/user');
const Booking = require('./model/booking'); // optional, can define inline

// ========================
// ROUTES
// ========================
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const memberRoutes = require('./routes/member');
const vendorRoutes = require('./routes/vendor');
const notificationRoutes = require('./routes/firebasenotification');

app.use('/api', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/notify', notificationRoutes);

// ========================
// VENDOR STATUS API (MongoDB-based)
// ========================

// GET vendor status
app.get('/api/vendor/status/:vendorId', async (req, res) => {
  try {
    const vendor = await User.findById(req.params.vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ vendorId: vendor._id, status: vendor.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SET vendor status
app.post('/api/vendor/status', async (req, res) => {
  try {
    const { vendorId, status } = req.body;
    const vendor = await User.findByIdAndUpdate(
      vendorId,
      { status },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ vendorId: vendor._id, status: vendor.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// START SERVER
// ========================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
