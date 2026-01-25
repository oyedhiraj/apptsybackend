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
// SOCKET.IO SETUP
// ========================
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: '*' }
});

// In-memory vendor status store
// You can later move this to MongoDB if needed
let vendorStatusStore = {}; // { vendorId: 'available' | 'busy' }

// Socket connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Listen for vendor status updates
  socket.on('vendor-status-update', (data) => {
    console.log('Status update received:', data);

    // Save status in memory
    vendorStatusStore[data.vendorId] = data.status;

    // Broadcast to all clients
    io.emit('vendor-status-changed', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

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
// STATUS API (Optional but useful)
// ========================

const vendorRoutes = require('./routes/vendor');
app.use('/api/vendor', vendorRoutes);
app.get('/api/vendor/status/:vendorId', (req, res) => {
  const vendorId = req.params.vendorId;
  const status = vendorStatusStore[vendorId] || 'available';
  res.json({ vendorId, status });
});

app.post('/api/vendor/status', (req, res) => {
  const { vendorId, status } = req.body;
  vendorStatusStore[vendorId] = status;

  // Broadcast status change
  io.emit('vendor-status-changed', { vendorId, status });

  res.json({ success: true, vendorId, status });
});

// ========================
// START SERVER
// ========================
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
