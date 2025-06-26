const express = require('express');
const request = require('supertest');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const oauthRouter = require('../routes/oauth');

// Mock environment variables
process.env.GOOGLE_CLIENT_ID = 'test_client_id';
process.env.GOOGLE_CLIENT_SECRET = 'test_client_secret';

// Mock User model
jest.mock('../models/User');

// Mock fetch for getUserData
global.fetch = jest.fn();

// Create mock functions for OAuth2Client
const mockGetToken = jest.fn();
const mockSetCredentials = jest.fn();
const mockGenerateAuthUrl = jest.fn();

// Mock OAuth2Client
jest.mock('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({
        getToken: mockGetToken,
        setCredentials: mockSetCredentials,
        generateAuthUrl: mockGenerateAuthUrl,
        credentials: {
            access_token: 'test_access_token'
        }
    }))
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/oauth', oauthRouter);

describe('OAuth Router', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.error = jest.fn(); // Mock console.error
        console.log = jest.fn(); // Mock console.log
    });

    describe('getUserData function', () => {
        it('should fetch and parse user data correctly', async () => {
            const mockUserData = {
                email: 'test@example.com',
                name: 'Test User',
                picture: 'test.jpg',
                sub: 'test123'
            };

            // Mock the fetch response for getUserData specifically
            fetch.mockImplementationOnce(() => Promise.resolve({
                json: () => Promise.resolve(mockUserData)
            }));

            // Mock token response to trigger getUserData call
            const mockTokens = {
                id_token: 'test_id_token',
                access_token: 'test_access_token'
            };
            mockGetToken.mockResolvedValue({ tokens: mockTokens });

            // Mock user save
            User.prototype.save = jest.fn().mockResolvedValue(true);

            await request(app)
                .get('/oauth')
                .query({ code: 'test_code' });

            // Verify the fetch call was made with correct URL
            expect(fetch).toHaveBeenCalledWith(
                'https://www.googleapis.com/oauth2/v3/userinfo?access_token=test_access_token'
            );

            // Verify user data was processed
            expect(console.log).toHaveBeenCalledWith('Google user data:', mockUserData);
        });

        it('should handle getUserData json parsing error', async () => {
            // Mock token response
            const mockTokens = {
                id_token: 'test_id_token',
                access_token: 'test_access_token'
            };
            mockGetToken.mockResolvedValue({ tokens: mockTokens });

            // Mock fetch response with JSON parsing error
            fetch.mockImplementationOnce(() => Promise.resolve({
                json: () => Promise.reject(new Error('Invalid JSON'))
            }));

            const response = await request(app)
                .get('/oauth')
                .query({ code: 'test_code' });

            expect(response.status).toBe(302);
            expect(response.header.location).toContain('success=false');
            expect(console.error).toHaveBeenCalledWith('Error signing in with Google:', expect.any(Error));
        });
    });

    describe('GET /oauth', () => {
        it('should log oauth route access', async () => {
            const response = await request(app)
                .get('/oauth');

            expect(console.log).toHaveBeenCalledWith('oauth route');
        });

        it('should log the authorization code', async () => {
            const response = await request(app)
                .get('/oauth')
                .query({ code: 'test_code' });

            expect(console.log).toHaveBeenCalledWith('code', 'test_code');
        });

        it('should return 400 if code is missing', async () => {
            const response = await request(app)
                .get('/oauth');

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                error: 'Authorization code is required'
            });
        });

        it('should handle successful authentication with complete flow', async () => {
            // Mock successful token response
            const mockTokens = {
                id_token: 'test_id_token',
                access_token: 'test_access_token'
            };
            mockGetToken.mockResolvedValue({ tokens: mockTokens });

            // Mock successful user info response
            const mockUserData = {
                email: 'test@example.com',
                name: 'Test User',
                picture: 'test.jpg',
                sub: 'test123'
            };
            fetch.mockImplementationOnce(() => Promise.resolve({
                json: () => Promise.resolve(mockUserData)
            }));

            // Mock successful user save
            User.prototype.save = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .get('/oauth')
                .query({ code: 'test_code' });

            // Verify OAuth2Client setup
            expect(OAuth2Client).toHaveBeenCalledWith(
                'test_client_id',
                'test_client_secret',
                'http://localhost:3000/oauth'
            );

            // Verify token acquisition
            expect(mockGetToken).toHaveBeenCalledWith('test_code');
            expect(mockSetCredentials).toHaveBeenCalledWith(mockTokens);

            // Verify all console.log calls in sequence
            expect(console.log.mock.calls).toEqual([
                ['oauth route'],
                ['code', 'test_code'],
                ['Token response:', mockTokens],
                ['tokens acquired'],
                ['Google user data:', mockUserData],
                ['Sending user response with token:', expect.any(Object)]
            ]);

            // Verify user creation and save
            expect(User.prototype.save).toHaveBeenCalledWith();
            expect(response.status).toBe(302);
            expect(response.header.location).toContain('success=true');
            expect(response.header.location).toContain(encodeURIComponent(JSON.stringify({
                email: mockUserData.email,
                name: mockUserData.name,
                picture: mockUserData.picture,
                provider: 'google',
                providerId: mockUserData.sub,
                token: mockTokens.id_token
            })));
        });

        it('should handle token acquisition failure', async () => {
            mockGetToken.mockRejectedValue(new Error('Token Error'));

            const response = await request(app)
                .get('/oauth')
                .query({ code: 'test_code' });

            expect(response.status).toBe(302);
            expect(response.header.location).toContain('success=false');
            expect(response.header.location).toContain('Failed%20to%20authenticate%20with%20Google');
            expect(console.error).toHaveBeenCalledWith('Error signing in with Google:', expect.any(Error));
        });

        it('should handle setCredentials failure', async () => {
            const mockTokens = {
                id_token: 'test_id_token',
                access_token: 'test_access_token'
            };
            mockGetToken.mockResolvedValue({ tokens: mockTokens });
            mockSetCredentials.mockImplementation(() => {
                throw new Error('Credentials Error');
            });

            const response = await request(app)
                .get('/oauth')
                .query({ code: 'test_code' });

            expect(response.status).toBe(302);
            expect(response.header.location).toContain('success=false');
            expect(console.error).toHaveBeenCalledWith('Error signing in with Google:', expect.any(Error));
        });

        it('should handle user save failure', async () => {
            // Mock successful token response
            const mockTokens = {
                id_token: 'test_id_token',
                access_token: 'test_access_token'
            };
            mockGetToken.mockResolvedValue({ tokens: mockTokens });

            // Mock successful user info response
            fetch.mockImplementationOnce(() => Promise.resolve({
                json: () => Promise.resolve({
                    email: 'test@example.com',
                    name: 'Test User',
                    picture: 'test.jpg',
                    sub: 'test123'
                })
            }));

            // Mock failed user save
            User.prototype.save = jest.fn().mockRejectedValue(new Error('Database Error'));

            const response = await request(app)
                .get('/oauth')
                .query({ code: 'test_code' });

            expect(response.status).toBe(302);
            expect(response.header.location).toContain('success=false');
            expect(console.error).toHaveBeenCalledWith('Error signing in with Google:', expect.any(Error));
        });

        it('should handle malformed user info response', async () => {
            // Mock successful token response
            const mockTokens = {
                id_token: 'test_id_token',
                access_token: 'test_access_token'
            };
            mockGetToken.mockResolvedValue({ tokens: mockTokens });

            // Mock malformed user info response
            fetch.mockImplementationOnce(() => Promise.resolve({
                json: () => Promise.resolve({}) // Empty response
            }));

            const response = await request(app)
                .get('/oauth')
                .query({ code: 'test_code' });

            expect(response.status).toBe(302);
            expect(response.header.location).toContain('success=false');
            expect(console.error).toHaveBeenCalled();
        });
    });
}); 