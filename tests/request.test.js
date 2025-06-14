const express = require('express');
const request = require('supertest');
const { OAuth2Client } = require('google-auth-library');
const requestRouter = require('../routes/request');

// Mock environment variables
process.env.GOOGLE_CLIENT_ID = 'test_client_id';
process.env.GOOGLE_CLIENT_SECRET = 'test_client_secret';

// Mock OAuth2Client
jest.mock('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/mock-auth-url')
    }))
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/request', requestRouter);

describe('Request Router', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn(); // Mock console.log
    });

    describe('POST /request', () => {
        it('should return Google authorization URL', async () => {
            const response = await request(app)
                .post('/request');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                url: 'https://accounts.google.com/mock-auth-url'
            });
            expect(OAuth2Client).toHaveBeenCalledWith(
                'test_client_id',
                'test_client_secret',
                'http://localhost:3000/oauth'
            );
            expect(OAuth2Client.mock.results[0].value.generateAuthUrl).toHaveBeenCalledWith({
                access_type: 'offline',
                scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
                prompt: 'consent'
            });
            expect(console.log).toHaveBeenCalledWith('authorizeUrl', 'https://accounts.google.com/mock-auth-url');
        });
    });
}); 