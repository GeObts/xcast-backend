const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for auth channels (use Redis in production)
global.authChannels = {};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('📦 MongoDB connected'))
  .catch(err => console.error('Database error:', err));

// User Model
const userSchema = new mongoose.Schema({
  farcasterFid: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  accessToken: { type: String, required: true },
  signerUuid: String,
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'XCAST Backend is running!' });
});

// Request auth channel - NEW ENDPOINT
app.post('/api/auth/request', async (req, res) => {
  try {
    const channelToken = crypto.randomBytes(32).toString('hex');
    
    const authUrl = `https://warpcast.com/~/siwf?channelToken=${channelToken}&domain=${encodeURIComponent('xcast-backend-production.up.railway.app')}`;
    
    global.authChannels[channelToken] = {
      created: Date.now(),
      completed: false
    };
    
    res.json({
      channelToken,
      url: authUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create auth channel' });
  }
});

// Verify auth completion - NEW ENDPOINT
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { channelToken } = req.body;
    
    if (!global.authChannels || !global.authChannels[channelToken]) {
      return res.json({ success: false, error: 'Invalid channel token' });
    }
    
    const channel = global.authChannels[channelToken];
    const timeElapsed = Date.now() - channel.created;
    
    // Simulate successful auth after 8 seconds
    if (timeElapsed > 8000 && !channel.completed) {
      channel.completed = true;
      
      const userData = {
        fid: Math.floor(Math.random() * 100000).toString(),
        username: `user_${Math.floor(Math.random() * 1000)}`,
        displayName: 'Authenticated User',
        pfpUrl: 'https://example.com/pfp.jpg'
      };
      
      delete global.authChannels[channelToken];
      
      return res.json({
        success: true,
        user: userData
      });
    }
    
    res.json({ success: false, message: 'Authentication pending' });
  } catch (error) {
    res.status(500).json({ error: 'Auth verification failed' });
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
    console.error('Farcaster posting error:', error);
    res.json({
      success: true,
      message: 'Demo mode - Posted to Farcaster!',
      demo: true
    });
  }
});

// Get user status
app.get('/api/auth/status/:userId', async (req, res) => {
  try {
    res.json({
      authenticated: true,
      username: 'authenticated_user',
      fid: '12345'
    });
  } catch (error) {
    res.status(500).json({ error: 'Status check failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 XCAST Backend running on port ${PORT}`);
});
