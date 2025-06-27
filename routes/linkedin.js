const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

router.post('/request', async function(req, res) {
    const redirectUri = process.env.NODE_ENV === 'production' 
        ? `${process.env.BACKEND_URL}/auth/linkedin/callback`
        : 'http://localhost:3000/auth/linkedin/callback';
    const scope = 'openid profile email';
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}`;
    
    res.json({ url: authUrl });
});

router.get('/callback', async function(req, res) {
    const code = req.query.code;
    const redirectUri = process.env.NODE_ENV === 'production' 
        ? `${process.env.BACKEND_URL}/auth/linkedin/callback`
        : 'http://localhost:3000/auth/linkedin/callback';

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }

    try {
        const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: process.env.LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET
        });

        const tokenResponse = await fetch(`${tokenUrl}?${params.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            }
        });
        const linkedinUserData = await profileResponse.json();
        
        // Create or update user in MongoDB
        const userData = {
            email: linkedinUserData.email,
            name: linkedinUserData.name,
            picture: linkedinUserData.picture,
            provider: 'linkedin',
            providerId: linkedinUserData.sub
        };
        
        const userModel = new User(userData);
        await userModel.save();

        const userResponse = {
            ...userData,
            token: accessToken // Use LinkedIn access token for authentication
        };
        
        const frontendUrl = process.env.NODE_ENV === 'production' 
            ? process.env.FRONTEND_URL || process.env.BACKEND_URL
            : 'http://localhost:3001';
            
        res.redirect(`${frontendUrl}?success=true&user=${encodeURIComponent(JSON.stringify(userResponse))}`);
    } catch (error) {
        console.error('Error signing in with LinkedIn:', error);
        const frontendUrl = process.env.NODE_ENV === 'production' 
            ? process.env.FRONTEND_URL || process.env.BACKEND_URL
            : 'http://localhost:3001';
        res.redirect(`${frontendUrl}?success=false&error=${encodeURIComponent('Failed to authenticate with LinkedIn')}`);
    }
});

module.exports = router; 