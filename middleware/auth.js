const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token) {
  try {
    console.log('Attempting to verify Google token');
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    console.log('Google token payload:', payload);
    return payload;
  } catch (error) {
    console.error('Google token verification failed:', error);
    return null;
  }
}

async function verifyLinkedInToken(token) {
  try {
    console.log('Attempting to verify LinkedIn token');
    // Verify LinkedIn token by making a request to userinfo endpoint
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.error('LinkedIn verification failed:', await response.text());
      return null;
    }
    
    const payload = await response.json();
    console.log('LinkedIn token payload:', payload);
    return payload;
  } catch (error) {
    console.error('LinkedIn token verification failed:', error);
    return null;
  }
}

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    console.log('Received token:', token.substring(0, 20) + '...');

    // Try Google token first
    let payload = await verifyGoogleToken(token);
    let email;
    
    if (payload) {
      console.log('Successfully verified Google token');
      email = payload.email;
    } else {
      console.log('Google verification failed, trying LinkedIn');
      // If Google token verification fails, try LinkedIn
      payload = await verifyLinkedInToken(token);
      if (payload) {
        console.log('Successfully verified LinkedIn token');
        email = payload.email;
      }
    }

    if (!email) {
      console.error('No email found in token payload');
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('Looking up user with email:', email);
    // Get user from database
    const user = await User.findByEmail(email);
    if (!user) {
      console.error('User not found in database');
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = auth; 