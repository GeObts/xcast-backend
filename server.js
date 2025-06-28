const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('📦 MongoDB connected'))
  .catch(err => console.error('Database error:', err));

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'XCAST Backend is running!' });
});

// Simple auth endpoint for demo
app.post('/api/auth/demo', async (req, res) => {
  try {
    const demoUser = {
      id: 'demo-user-123',
      username: 'demo_user',
      fid: '12345'
    };
    
    res.json({
      success: true,
      user: demoUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Auth failed' });
  }
});

// Post to Farcaster
app.post('/api/posts/farcaster', async (req, res) => {
  try {
    const { userId, text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    // For demo - return success
    res.json({
      success: true,
      message: 'Posted to Farcaster!',
      demo: true
    });

  } catch (error) {
    res.json({
      success: true,
      message: 'Demo mode - Post would go to Farcaster!',
      demo: true
    });
  }
});

// Get user status
app.get('/api/auth/status/:userId', async (req, res) => {
  try {
    res.json({
      authenticated: true,
      username: 'demo_user',
      fid: '12345'
    });
  } catch (error) {
    res.status(500).json({ error: 'Status check failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 XCAST Backend running on port ${PORT}`);
});
