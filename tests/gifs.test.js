const express = require('express');
const request = require('supertest');
const Gif = require('../models/Gif');
const auth = require('../middleware/auth');
const gifsRouter = require('../routes/gifs');

// Mock the auth middleware
jest.mock('../middleware/auth', () => {
    return jest.fn((req, res, next) => {
        req.user = { email: 'test@example.com' };
        next();
    });
});

// Mock the Gif model
jest.mock('../models/Gif');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/gifs', gifsRouter);

describe('Gifs Router', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('POST /gifs/save', () => {
        const mockGifData = {
            id: '123',
            title: 'Test GIF',
            url: 'http://example.com/gif.gif',
            preview: 'http://example.com/preview.gif',
            tags: ['funny', 'test'],
            caption: 'Test caption'
        };

        it('should successfully save a GIF', async () => {
            const mockSavedGif = { ...mockGifData, userId: 'test@example.com' };
            Gif.prototype.save = jest.fn().mockResolvedValue(mockSavedGif);

            const response = await request(app)
                .post('/gifs/save')
                .send(mockGifData);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                success: true,
                gif: mockSavedGif
            });
            expect(Gif.prototype.save).toHaveBeenCalled();
        });

        it('should handle errors when saving fails', async () => {
            Gif.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/gifs/save')
                .send(mockGifData);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                error: 'Failed to save GIF'
            });
        });
    });

    describe('GET /gifs/user/:userId', () => {
        it('should return user\'s GIFs when authorized', async () => {
            const mockGifs = [
                { id: '1', title: 'GIF 1' },
                { id: '2', title: 'GIF 2' }
            ];
            Gif.findByUserId = jest.fn().mockResolvedValue(mockGifs);

            const response = await request(app)
                .get('/gifs/user/test@example.com');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                gifs: mockGifs
            });
            expect(Gif.findByUserId).toHaveBeenCalledWith('test@example.com');
        });

        it('should reject unauthorized access', async () => {
            const response = await request(app)
                .get('/gifs/user/other@example.com');

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                success: false,
                error: 'Unauthorized access'
            });
        });

        it('should handle database errors when fetching GIFs', async () => {
            Gif.findByUserId = jest.fn().mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/gifs/user/test@example.com');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                success: false,
                error: 'Failed to fetch GIFs'
            });
        });
    });

    describe('DELETE /gifs/:id', () => {
        it('should delete GIF when authorized', async () => {
            Gif.findById = jest.fn().mockResolvedValue({
                id: '123',
                userId: 'test@example.com'
            });
            Gif.delete = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .delete('/gifs/123');

            expect(response.status).toBe(204);
            expect(Gif.delete).toHaveBeenCalledWith('123');
        });

        it('should return 404 when GIF not found', async () => {
            Gif.findById = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .delete('/gifs/123');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                error: 'GIF not found'
            });
        });

        it('should reject unauthorized deletion', async () => {
            Gif.findById = jest.fn().mockResolvedValue({
                id: '123',
                userId: 'other@example.com'
            });

            const response = await request(app)
                .delete('/gifs/123');

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                success: false,
                error: 'Unauthorized access'
            });
        });

        it('should handle database errors when deleting', async () => {
            Gif.findById = jest.fn().mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .delete('/gifs/123');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                success: false,
                error: 'Failed to delete GIF'
            });
        });
    });

    describe('PUT /gifs/:id/caption', () => {
        it('should update caption when authorized', async () => {
            Gif.findById = jest.fn().mockResolvedValue({
                id: '123',
                userId: 'test@example.com'
            });
            Gif.updateCaption = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .put('/gifs/123/caption')
                .send({ caption: 'New caption' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true });
            expect(Gif.updateCaption).toHaveBeenCalledWith('123', 'New caption');
        });

        it('should return 404 when GIF not found', async () => {
            Gif.findById = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .put('/gifs/123/caption')
                .send({ caption: 'New caption' });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                error: 'GIF not found'
            });
        });

        it('should reject unauthorized caption update', async () => {
            Gif.findById = jest.fn().mockResolvedValue({
                id: '123',
                userId: 'other@example.com'
            });

            const response = await request(app)
                .put('/gifs/123/caption')
                .send({ caption: 'New caption' });

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                success: false,
                error: 'Unauthorized access'
            });
        });

        it('should handle database errors when updating caption', async () => {
            Gif.findById = jest.fn().mockResolvedValue({
                id: '123',
                userId: 'test@example.com'
            });
            Gif.updateCaption = jest.fn().mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .put('/gifs/123/caption')
                .send({ caption: 'New caption' });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                error: 'Failed to update caption'
            });
        });
    });
});

