const express = require('express');
const request = require('supertest');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Mock environment variables
process.env.GOOGLE_CLIENT_ID = 'test_client_id';

// Mock User model
jest.mock('../models/User');

// Mock fetch for LinkedIn verification
global.fetch = jest.fn();

// Mock OAuth2Client
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn()
  }))
}));

// Create Express app for testing
const app = express();
app.use(express.json());

// Create a test endpoint that uses the auth middleware
app.get('/test', auth, (req, res) => {
  res.json({ user: req.user });
});

describe('Auth Middleware', () => {
  let mockOAuth2Client;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn(); // Mock console.error
    console.log = jest.fn(); // Mock console.log
    
    // Get instance of mocked OAuth2Client
    mockOAuth2Client = new OAuth2Client();
  });

  describe('Authorization Header Validation', () => {
    it('should return 401 if no authorization header is present', async () => {
      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'No authorization header' });
    });

    it('should return 401 if token is missing from authorization header', async () => {
      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'No token provided' });
    });
  });

  describe('Google Token Verification', () => {
    it('should successfully verify Google token and find user', async () => {
      const mockPayload = {
        email: 'test@example.com'
      };
      const mockUser = { id: '123', email: 'test@example.com' };

      mockOAuth2Client.verifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });
      User.findByEmail = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer google_token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: mockUser });
      expect(console.log).toHaveBeenCalledWith('Successfully verified Google token');
    });

    it('should handle Google token verification failure and return null', async () => {
      const error = new Error('Invalid token');
      mockOAuth2Client.verifyIdToken.mockRejectedValue(error);

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid_token');

      expect(console.error).toHaveBeenCalledWith('Google token verification failed:', error);
      // Verify that the function continues to try LinkedIn verification
      expect(console.log).toHaveBeenCalledWith('Google verification failed, trying LinkedIn');
    });
  });

  describe('LinkedIn Token Verification', () => {
    it('should successfully verify LinkedIn token and find user after Google failure', async () => {
      // Mock Google verification failure
      mockOAuth2Client.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      // Mock successful LinkedIn verification
      const mockLinkedInPayload = {
        email: 'test@example.com'
      };
      const mockUser = { id: '123', email: 'test@example.com' };

      fetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockLinkedInPayload)
      }));
      User.findByEmail = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer linkedin_token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: mockUser });
      expect(console.log).toHaveBeenCalledWith('Successfully verified LinkedIn token');
      expect(console.log).toHaveBeenCalledWith('Google verification failed, trying LinkedIn');
    });

    it('should handle LinkedIn API error response', async () => {
      // Mock Google verification failure
      mockOAuth2Client.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      // Mock LinkedIn API error
      fetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        text: () => Promise.resolve('API Error')
      }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid_token');

      expect(console.error).toHaveBeenCalledWith('LinkedIn verification failed:', 'API Error');
    });

    it('should handle LinkedIn network error', async () => {
      // Mock Google verification failure
      mockOAuth2Client.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      // Mock LinkedIn network error
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid_token');

      expect(console.error).toHaveBeenCalledWith('LinkedIn token verification failed:', expect.any(Error));
    });
  });

  describe('User Lookup', () => {
    it('should return 401 if no email found in token payload', async () => {
      // Mock both Google and LinkedIn verification failure
      mockOAuth2Client.verifyIdToken.mockRejectedValue(new Error('Invalid token'));
      fetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}) // Empty payload without email
      }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid token' });
      expect(console.error).toHaveBeenCalledWith('No email found in token payload');
    });

    it('should return 401 if user not found in database after successful token verification', async () => {
      const mockPayload = {
        email: 'test@example.com'
      };

      mockOAuth2Client.verifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });
      User.findByEmail = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'User not found' });
      expect(console.error).toHaveBeenCalledWith('User not found in database');
      expect(console.log).toHaveBeenCalledWith('Looking up user with email:', 'test@example.com');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on unexpected errors and log them', async () => {
      const error = new Error('Unexpected error');
      mockOAuth2Client.verifyIdToken.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
      expect(console.error).toHaveBeenCalledWith('Auth middleware error:', error);
    });
  });
}); 