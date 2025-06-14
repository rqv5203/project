const express = require('express');
const request = require('supertest');
const User = require('../models/User');
const linkedinRouter = require('../routes/linkedin');

// Mock environment variables
process.env.LINKEDIN_CLIENT_ID = 'test_client_id';
process.env.LINKEDIN_CLIENT_SECRET = 'test_client_secret';

// Mock User model
jest.mock('../models/User');

// Mock fetch
global.fetch = jest.fn();
global.URLSearchParams = jest.fn(() => ({
    toString: () => 'mocked_params'
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/auth/linkedin', linkedinRouter);

describe('LinkedIn Router', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /auth/linkedin/request', () => {
        it('should return authorization URL', async () => {
            const response = await request(app)
                .post('/auth/linkedin/request');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('url');
            expect(response.body.url).toContain('linkedin.com/oauth/v2/authorization');
            expect(response.body.url).toContain('test_client_id');
        });
    });

    describe('GET /auth/linkedin/callback', () => {
        it('should return 400 if code is missing', async () => {
            const response = await request(app)
                .get('/auth/linkedin/callback');

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                error: 'Authorization code is required'
            });
        });

        it('should handle successful authentication', async () => {
            // Mock successful token response
            fetch.mockImplementationOnce(() => Promise.resolve({
                json: () => Promise.resolve({
                    access_token: 'test_access_token'
                })
            }));

            // Mock successful profile response
            fetch.mockImplementationOnce(() => Promise.resolve({
                json: () => Promise.resolve({
                    email: 'test@example.com',
                    name: 'Test User',
                    picture: 'test.jpg',
                    sub: 'test123'
                })
            }));

            // Mock successful user save
            User.prototype.save = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .get('/auth/linkedin/callback')
                .query({ code: 'test_code' });

            expect(response.status).toBe(302); // Redirect
            expect(response.header.location).toContain('success=true');
            expect(User.prototype.save).toHaveBeenCalled();
        });

        it('should handle authentication failure', async () => {
            fetch.mockImplementationOnce(() => Promise.reject(new Error('API Error')));

            const response = await request(app)
                .get('/auth/linkedin/callback')
                .query({ code: 'test_code' });

            expect(response.status).toBe(302); // Redirect
            expect(response.header.location).toContain('success=false');
            expect(response.header.location).toContain('Failed%20to%20authenticate%20with%20LinkedIn');
        });
    });
}); 