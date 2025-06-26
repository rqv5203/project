const express = require('express');
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const WeatherCollection = require('../models/WeatherCollection');
const auth = require('../middleware/auth');
const weatherRouter = require('../routes/weather');

// Mock the auth middleware
jest.mock('../middleware/auth', () => {
    return jest.fn((req, res, next) => {
        req.user = { email: 'test@example.com' };
        next();
    });
});

// Mock the WeatherCollection model
jest.mock('../models/WeatherCollection');

// Mock multer
jest.mock('multer', () => {
    const multer = () => ({
        single: () => (req, res, next) => {
            if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
                req.file = {
                    fieldname: 'photo',
                    originalname: 'test.jpg',
                    encoding: '7bit',
                    mimetype: 'image/jpeg',
                    destination: 'uploads/photos/',
                    filename: 'test-123456789.jpg',
                    path: 'uploads/photos/test-123456789.jpg',
                    size: 1024
                };
            }
            next();
        }
    });
    multer.diskStorage = jest.fn();
    return multer;
});

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/weather', weatherRouter);

describe('Weather Router', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /weather/save', () => {
        const mockWeatherData = {
            title: 'Test Weather Collection',
            startDate: '2023-01-01',
            endDate: '2023-01-07',
            location: 'New York',
            weatherData: {
                daily: {
                    time: ['2023-01-01', '2023-01-02'],
                    temperature_2m_max: [20, 22],
                    temperature_2m_min: [15, 17],
                    weather_code: [0, 1]
                }
            }
        };

        it('should successfully save a weather collection with title', async () => {
            const mockSavedCollection = { 
                ...mockWeatherData, 
                userId: 'test@example.com',
                id: '123'
            };
            WeatherCollection.prototype.save = jest.fn().mockResolvedValue(mockSavedCollection);

            const response = await request(app)
                .post('/weather/save')
                .send(mockWeatherData);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                success: true,
                collection: mockSavedCollection
            });
        });

        it('should save with default title when title is not provided', async () => {
            const dataWithoutTitle = { ...mockWeatherData };
            delete dataWithoutTitle.title;
            
            const mockSavedCollection = { 
                ...dataWithoutTitle, 
                title: 'Untitled Collection',
                userId: 'test@example.com',
                id: '123' 
            };
            
            WeatherCollection.prototype.save = jest.fn().mockResolvedValue(mockSavedCollection);

            const response = await request(app)
                .post('/weather/save')
                .send(dataWithoutTitle);

            expect(response.status).toBe(201);
        });

        it('should handle save errors', async () => {
            WeatherCollection.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/weather/save')
                .send(mockWeatherData);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                error: 'Failed to save weather collection'
            });
        });

        it('should handle empty request body', async () => {
            const mockSavedCollection = { 
                title: 'Untitled Collection',
                userId: 'test@example.com',
                id: '123' 
            };
            
            WeatherCollection.prototype.save = jest.fn().mockResolvedValue(mockSavedCollection);

            const response = await request(app)
                .post('/weather/save')
                .send({});

            expect(response.status).toBe(201);
        });
    });

    describe('GET /weather/user/:userId', () => {
        it('should return user weather collections when authorized', async () => {
            const mockCollections = [
                { id: '1', title: 'Collection 1', userId: 'test@example.com' },
                { id: '2', title: 'Collection 2', userId: 'test@example.com' }
            ];
            WeatherCollection.findByUserId = jest.fn().mockResolvedValue(mockCollections);

            const response = await request(app)
                .get('/weather/user/test@example.com');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                collections: mockCollections
            });
            expect(WeatherCollection.findByUserId).toHaveBeenCalledWith('test@example.com');
        });

        it('should reject unauthorized access to different user', async () => {
            const response = await request(app)
                .get('/weather/user/other@example.com');

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                success: false,
                error: 'Unauthorized access'
            });
        });

        it('should handle database errors when fetching collections', async () => {
            WeatherCollection.findByUserId = jest.fn().mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/weather/user/test@example.com');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                success: false,
                error: 'Failed to fetch weather collections'
            });
        });

        it('should return empty array when no collections found', async () => {
            WeatherCollection.findByUserId = jest.fn().mockResolvedValue([]);

            const response = await request(app)
                .get('/weather/user/test@example.com');

            expect(response.status).toBe(200);
            expect(response.body.collections).toEqual([]);
        });
    });

    describe('GET /weather/:id', () => {
        it('should return weather collection when authorized', async () => {
            const mockCollection = {
                id: '123',
                title: 'Test Collection',
                userId: 'test@example.com',
                startDate: '2023-01-01',
                endDate: '2023-01-07'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);

            const response = await request(app)
                .get('/weather/123');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                collection: mockCollection
            });
            expect(WeatherCollection.findById).toHaveBeenCalledWith('123');
        });

        it('should return 404 when collection not found', async () => {
            WeatherCollection.findById = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .get('/weather/nonexistent');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                error: 'Weather collection not found'
            });
        });

        it('should reject unauthorized access to other user collection', async () => {
            const mockCollection = {
                id: '123',
                userId: 'other@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);

            const response = await request(app)
                .get('/weather/123');

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                success: false,
                error: 'Unauthorized access'
            });
        });

        it('should handle database errors when fetching single collection', async () => {
            WeatherCollection.findById = jest.fn().mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/weather/123');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                success: false,
                error: 'Failed to fetch weather collection'
            });
        });
    });

    describe('DELETE /weather/:id', () => {
        it('should delete weather collection when authorized', async () => {
            const mockCollection = {
                id: '123',
                userId: 'test@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);
            WeatherCollection.delete = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .delete('/weather/123');

            expect(response.status).toBe(204);
            expect(WeatherCollection.delete).toHaveBeenCalledWith('123');
        });

        it('should return 404 when trying to delete non-existent collection', async () => {
            WeatherCollection.findById = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .delete('/weather/nonexistent');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                error: 'Weather collection not found'
            });
        });

        it('should reject unauthorized deletion attempt', async () => {
            const mockCollection = {
                id: '123',
                userId: 'other@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);

            const response = await request(app)
                .delete('/weather/123');

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                success: false,
                error: 'Unauthorized access'
            });
        });

        it('should handle database errors during deletion', async () => {
            WeatherCollection.findById = jest.fn().mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .delete('/weather/123');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                success: false,
                error: 'Failed to delete weather collection'
            });
        });
    });

    describe('PUT /weather/:id/title', () => {
        it('should update title when authorized', async () => {
            const mockCollection = {
                id: '123',
                userId: 'test@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);
            WeatherCollection.updateTitle = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .put('/weather/123/title')
                .send({ title: 'Updated Title' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true });
            expect(WeatherCollection.updateTitle).toHaveBeenCalledWith('123', 'Updated Title');
        });

        it('should return 404 when collection not found for title update', async () => {
            WeatherCollection.findById = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .put('/weather/nonexistent/title')
                .send({ title: 'New Title' });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                error: 'Weather collection not found'
            });
        });

        it('should reject unauthorized title update', async () => {
            const mockCollection = {
                id: '123',
                userId: 'other@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);

            const response = await request(app)
                .put('/weather/123/title')
                .send({ title: 'Hacker Title' });

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                success: false,
                error: 'Unauthorized access'
            });
        });

        it('should handle database errors during title update', async () => {
            const mockCollection = {
                id: '123',
                userId: 'test@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);
            WeatherCollection.updateTitle = jest.fn().mockRejectedValue(new Error('Update failed'));

            const response = await request(app)
                .put('/weather/123/title')
                .send({ title: 'New Title' });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                error: 'Failed to update title'
            });
        });

        it('should handle empty title update', async () => {
            const mockCollection = {
                id: '123',
                userId: 'test@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);
            WeatherCollection.updateTitle = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .put('/weather/123/title')
                .send({ title: '' });

            expect(response.status).toBe(200);
            expect(WeatherCollection.updateTitle).toHaveBeenCalledWith('123', '');
        });
    });

    describe('POST /weather/:id/photo/:date', () => {
        it('should upload photo when authorized', async () => {
            const mockCollection = {
                id: '123',
                userId: 'test@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);
            WeatherCollection.updatePhoto = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .post('/weather/123/photo/2023-01-01')
                .set('Content-Type', 'multipart/form-data')
                .attach('photo', Buffer.from('fake image'), 'test.jpg');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                photoUrl: '/uploads/photos/test-123456789.jpg'
            });
            expect(WeatherCollection.updatePhoto).toHaveBeenCalledWith('123', '2023-01-01', '/uploads/photos/test-123456789.jpg');
        });

        it('should return 404 when collection not found for photo upload', async () => {
            WeatherCollection.findById = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .post('/weather/nonexistent/photo/2023-01-01')
                .set('Content-Type', 'multipart/form-data')
                .attach('photo', Buffer.from('fake image'), 'test.jpg');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                error: 'Weather collection not found'
            });
        });

        it('should reject unauthorized photo upload', async () => {
            const mockCollection = {
                id: '123',
                userId: 'other@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);

            const response = await request(app)
                .post('/weather/123/photo/2023-01-01')
                .set('Content-Type', 'multipart/form-data')
                .attach('photo', Buffer.from('fake image'), 'test.jpg');

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                success: false,
                error: 'Unauthorized access'
            });
        });

        it('should handle missing file in upload request', async () => {
            const mockCollection = {
                id: '123',
                userId: 'test@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);

            const response = await request(app)
                .post('/weather/123/photo/2023-01-01');

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                error: 'No file uploaded'
            });
        });

        it('should handle database errors during photo upload', async () => {
            const mockCollection = {
                id: '123',
                userId: 'test@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);
            WeatherCollection.updatePhoto = jest.fn().mockRejectedValue(new Error('Upload failed'));

            const response = await request(app)
                .post('/weather/123/photo/2023-01-01')
                .set('Content-Type', 'multipart/form-data')
                .attach('photo', Buffer.from('fake image'), 'test.jpg');

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                error: 'Failed to upload photo'
            });
        });
    });

    describe('DELETE /weather/:id/photo/:date', () => {
        it('should remove photo when authorized', async () => {
            const mockCollection = {
                id: '123',
                userId: 'test@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);
            WeatherCollection.removePhoto = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .delete('/weather/123/photo/2023-01-01');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true });
            expect(WeatherCollection.removePhoto).toHaveBeenCalledWith('123', '2023-01-01');
        });

        it('should return 404 when collection not found for photo removal', async () => {
            WeatherCollection.findById = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .delete('/weather/nonexistent/photo/2023-01-01');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                error: 'Weather collection not found'
            });
        });

        it('should reject unauthorized photo removal', async () => {
            const mockCollection = {
                id: '123',
                userId: 'other@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);

            const response = await request(app)
                .delete('/weather/123/photo/2023-01-01');

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                success: false,
                error: 'Unauthorized access'
            });
        });

        it('should handle database errors during photo removal', async () => {
            const mockCollection = {
                id: '123',
                userId: 'test@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);
            WeatherCollection.removePhoto = jest.fn().mockRejectedValue(new Error('Remove failed'));

            const response = await request(app)
                .delete('/weather/123/photo/2023-01-01');

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                error: 'Failed to remove photo'
            });
        });
    });

    describe('Error handling and edge cases', () => {
        it('should handle malformed JSON requests', async () => {
            const response = await request(app)
                .post('/weather/save')
                .send('invalid json')
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(400);
        });

        it('should handle special characters in collection ID', async () => {
            WeatherCollection.findById = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .get('/weather/collection%20with%20spaces');

            expect(response.status).toBe(404);
        });

        it('should handle special characters in date parameter', async () => {
            const mockCollection = {
                id: '123',
                userId: 'test@example.com'
            };
            WeatherCollection.findById = jest.fn().mockResolvedValue(mockCollection);
            WeatherCollection.removePhoto = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .delete('/weather/123/photo/2023-01-01%20modified');

            expect(response.status).toBe(200);
        });
    });

    describe('Authentication middleware coverage', () => {
        it('should ensure auth middleware is applied to all routes', async () => {
            // Test a few different endpoints to ensure auth is called
            await request(app).get('/weather/user/test@example.com');
            await request(app).post('/weather/save');
            await request(app).delete('/weather/123');

            expect(auth).toHaveBeenCalledTimes(3);
        });
    });
}); 