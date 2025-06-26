const express = require('express');
const request = require('supertest');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Mock the entire OAuth2Client
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn()
  }))
}));

// Mock the User model
jest.mock('../models/User');

// Mock fetch for LinkedIn verification
global.fetch = jest.fn();

// Create Express app for testing
const app = express();
app.use(auth);
app.get('/test', (req, res) => {
  res.status(200).json({ user: req.user });
});

describe('Auth Middleware', () => {
  let mockOAuth2Client;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    const { OAuth2Client } = require('google-auth-library');
    mockOAuth2Client = new OAuth2Client();
    
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should return 401 if no authorization header provided', async () => {
    const response = await request(app).get('/test');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'No authorization header' });
  });

  it('should return 401 if no token provided', async () => {
    const response = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'No token provided' });
  });

  describe('Google Token Verification', () => {
    it('should successfully verify Google token and find user', async () => {
      const mockPayload = {
        email: 'test@example.com'
      };
      const mockUser = { id: '123', email: 'test@example.com' };

      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(mockPayload)
      };
      mockOAuth2Client.verifyIdToken.mockResolvedValue(mockTicket);
      User.findByEmail = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer google_token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: mockUser });
      expect(consoleLogSpy).toHaveBeenCalledWith('Successfully verified Google token');
    });

    it('should handle Google token verification failure and try LinkedIn', async () => {
      const error = new Error('Invalid token');
      mockOAuth2Client.verifyIdToken.mockRejectedValue(error);

      // Mock LinkedIn failure too
      fetch.mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('API Error')
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Google token verification failed:', error);
      expect(consoleLogSpy).toHaveBeenCalledWith('Google verification failed, trying LinkedIn');
    });
  });

  describe('User Lookup', () => {
    it('should return 401 if user not found in database after successful token verification', async () => {
      const mockPayload = {
        email: 'test@example.com'
      };

      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(mockPayload)
      };
      mockOAuth2Client.verifyIdToken.mockResolvedValue(mockTicket);
      User.findByEmail = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'User not found' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('User not found in database');
      expect(consoleLogSpy).toHaveBeenCalledWith('Looking up user with email:', 'test@example.com');
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

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockLinkedInPayload)
      });
      User.findByEmail = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer linkedin_token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: mockUser });
      expect(consoleLogSpy).toHaveBeenCalledWith('Successfully verified LinkedIn token');
      expect(consoleLogSpy).toHaveBeenCalledWith('Google verification failed, trying LinkedIn');
    });

    it('should handle LinkedIn API error response', async () => {
      // Mock Google verification failure
      mockOAuth2Client.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      // Mock LinkedIn API error
      fetch.mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('API Error')
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(consoleErrorSpy).toHaveBeenCalledWith('LinkedIn verification failed:', 'API Error');
    });

    it('should handle LinkedIn network error', async () => {
      // Mock Google verification failure
      mockOAuth2Client.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      // Mock LinkedIn network error
      fetch.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(consoleErrorSpy).toHaveBeenCalledWith('LinkedIn token verification failed:', expect.any(Error));
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on unexpected errors and log them', async () => {
      const error = new Error('Unexpected error');
      
      // Mock Google to succeed but user lookup to throw
      const mockPayload = { email: 'test@example.com' };
      const mockTicket = { getPayload: jest.fn().mockReturnValue(mockPayload) };
      mockOAuth2Client.verifyIdToken.mockResolvedValue(mockTicket);
      
      User.findByEmail = jest.fn().mockRejectedValue(error);

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Auth middleware error:', error);
    });
  });
}); 