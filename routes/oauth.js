const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const {OAuth2Client} = require('google-auth-library');
const User = require('../models/User');

dotenv.config();

async function getUserData(access_token) {
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
    const data = await response.json();
    return data;
}

router.get('/', async function(req, res, next) {
    console.log('oauth route');
    
    const code = req.query.code;
    console.log('code', code);

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }

    try {
        const redirectUrl = process.env.NODE_ENV === 'production' 
            ? `${process.env.BACKEND_URL}/oauth`
            : 'http://localhost:3000/oauth';
        const oAuth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            redirectUrl
        );

        const response = await oAuth2Client.getToken(code);
        console.log('Token response:', response.tokens);
        
        await oAuth2Client.setCredentials(response.tokens);
        console.log('tokens acquired');
        
        const user = oAuth2Client.credentials;
        const googleUserData = await getUserData(user.access_token);
        console.log('Google user data:', googleUserData);
        
        // Create or update user in MongoDB
        const userData = {
            email: googleUserData.email,
            name: googleUserData.name,
            picture: googleUserData.picture,
            provider: 'google',
            providerId: googleUserData.sub
        };
        
        const userModel = new User(userData);
        await userModel.save();


        const userResponse = {
            ...userData,
            token: response.tokens.id_token
        };
        
        console.log('Sending user response with token:', {
            ...userResponse,
            token: userResponse.token.substring(0, 20) + '...'
        });
        
        const frontendUrl = process.env.NODE_ENV === 'production' 
            ? process.env.FRONTEND_URL || process.env.BACKEND_URL
            : 'http://localhost:3001';
        
        res.redirect(`${frontendUrl}?success=true&user=${encodeURIComponent(JSON.stringify(userResponse))}`);
    } catch (error) {
        console.error('Error signing in with Google:', error);
        const frontendUrl = process.env.NODE_ENV === 'production' 
            ? process.env.FRONTEND_URL || process.env.BACKEND_URL
            : 'http://localhost:3001';
        res.redirect(`${frontendUrl}?success=false&error=${encodeURIComponent('Failed to authenticate with Google')}`);
    }
});

module.exports = router;