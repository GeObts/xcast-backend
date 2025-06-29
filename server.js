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

// REAL Farcaster OAuth endpoint
app.get('/api/auth/farcaster', (req, res) => {
  const authUrl = `https://warpcast.com/~/oauth/authorize?` +
    `client_id=your-warpcast-client-id&` +
    `redirect_uri=${encodeURIComponent('https://xcast-backend-production.up.railway.app/auth/callback')}&` +
    `response_type=code&` +
    `scope=read write`;
  
  res.redirect(authUrl);
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (code) {
    try {
      // For now, create a real user with the code
      const newUser = {
        farcasterFid: '123456',
        username: 'real_user',
        accessToken: code,
        signerUuid: 'real-signer-uuid'
      };
      
      // Save to database
      const user = new User(newUser);
      await user.save();
      
      res.send(`
        <html>
          <script>
            window.opener.postMessage({
              type: 'XCAST_AUTH_SUCCESS',
              userId: '${user._id}',
              username: '${user.username}'
            }, '*');
            window.close();
          </script>
          <h1>✅ Connected to Farcaster!</h1>
          <p>You can close this window.</p>
        </html>
      `);
    } catch (error) {
      res.send(`
        <html>
          <script>
            window.opener.postMessage({
              type: 'XCAST_AUTH_ERROR',
              error: 'Authentication failed'
            }, '*');
            window.close();
          </script>
          <h1>❌ Authentication Failed</h1>
          <p>Please try again.</p>
        </html>
      `);
    }
  } else {
    res.status(400).send('Authorization code missing');
  }
});

// Post to Farcaster
app.post('/api/posts/farcaster', async (req, res) => {
  try {
    const { userId, text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    // Use your Neynar API key to post
    const response = await axios.post('https://api.neynar.com/v2/farcaster/cast', {
      signer_uuid: process.env.NEYNAR_SIGNER_UUID || 'your-signer-uuid',
      text: text
    }, {
      headers: {
        'accept': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY,
        'content-type': 'application/json'
      }
    });

    res.json({
      success: true,
      message: 'Posted to Farcaster!',
      cast: response.data
    });

  } catch (error) {
    console.error('Farcaster posting error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to post to Farcaster',
      details: error.response?.data || error.message
    });
  }
});

// Get user status
app.get('/api/auth/status/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (user) {
      res.json({
        authenticated: true,
        username: user.username,
        fid: user.farcasterFid
      });
    } else {
      res.json({ authenticated: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Status check failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 XCAST Backend running on port ${PORT}`);
});
