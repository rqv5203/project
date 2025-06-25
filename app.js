const express = require('express');
const dotenv = require('dotenv');
const {OAuth2Client} = require('google-auth-library');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const cors = require('cors');

// Configure CORS
app.use(cors({
  origin: 'http://localhost:3001', // You can specify allowed origins in your .env file
  credentials: true // Enable credentials (cookies, authorization headers, etc.)
}));

app.use(express.json());

// Serve static files for uploaded photos
app.use('/uploads', express.static('uploads'));

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	// store: ... , // Redis, Memcached, etc. See below.
})

// Apply the rate limiting middleware to all requests.
app.use(limiter)

var requestRoutes = require('./routes/request');
var oauthRoutes = require('./routes/oauth');
var linkedinRoutes = require('./routes/linkedin');
var gifsRoutes = require('./routes/gifs');
var weatherRoutes = require('./routes/weather');

app.use('/request', requestRoutes);
app.use('/oauth', oauthRoutes);
app.use('/auth/linkedin', linkedinRoutes);
app.use('/gifs', gifsRoutes);
app.use('/weather', weatherRoutes);

module.exports = app;