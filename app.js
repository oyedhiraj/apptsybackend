// ========================
// IMPORTS
// ========================
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
// Import booking routes
const bookingRoutes = require('./routes/bookings');

// Routes
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/member');

// ========================
// CONFIG
// ========================
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// MIDDLEWARE
// ========================
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(bodyParser.json());

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========================
// DATABASE CONNECTION
// ========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ========================
// ROUTES
// ========================
app.use('/api', authRoutes);
app.use('/api/member', memberRoutes);

// Use booking routes for /api/bookings
app.use('/api/bookings', bookingRoutes);

// ========================
// START SERVER
// ========================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
