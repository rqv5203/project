const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const {OAuth2Client} = require('google-auth-library');

dotenv.config();

router.post('/', async function (req, res, next) {
    const redirectUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.BACKEND_URL}/oauth`
        : 'http://localhost:3000/oauth';

    const oAuth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUrl
    );

    const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
        prompt: 'consent'
    });

    console.log('authorizeUrl', authorizeUrl);
    res.json({url: authorizeUrl});
});

module.exports = router;