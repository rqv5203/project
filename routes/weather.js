const express = require('express');
const router = express.Router();
const WeatherCollection = require('../models/WeatherCollection');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { uploadToGCS } = require('../services/storage');

// Apply auth middleware to all routes
router.use(auth);

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit for MongoDB storage
    },
    fileFilter: function (req, file, cb) {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Add error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, error: 'File too large' });
        }
    }
    if (err.message === 'Only image files are allowed') {
        return res.status(400).json({ success: false, error: 'Only image files are allowed' });
    }
    next(err);
};

// Save a weather collection
router.post('/save', async (req, res) => {
    try {
        const collectionData = {
            title: (req.body && req.body.title) || 'Untitled Collection',
            userId: req.user.email,
            startDate: req.body && req.body.startDate,
            endDate: req.body && req.body.endDate,
            location: req.body && req.body.location,
            weatherData: req.body && req.body.weatherData
        };

        const collection = new WeatherCollection(collectionData);
        const result = await collection.save();
        res.status(201).json({ success: true, collection: result });
    } catch (error) {
        //console.error('Error saving weather collection:', error);
        res.status(400).json({ success: false, error: 'Failed to save weather collection' });
    }
});

// Get user's saved weather collections
router.get('/user/:userId', async (req, res) => {
    try {
        if (req.params.userId !== req.user.email) {
            return res.status(403).json({ success: false, error: 'Unauthorized access' });
        }
        
        const collections = await WeatherCollection.findByUserId(req.user.email);
        res.status(200).json({ success: true, collections });
    } catch (error) {
        //console.error('Error fetching user weather collections:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch weather collections' });
    }
});

// Get a specific weather collection
router.get('/:id', async (req, res) => {
    try {
        const collection = await WeatherCollection.findById(req.params.id);
        
        if (!collection) {
            return res.status(404).json({ success: false, error: 'Weather collection not found' });
        }
        
        if (collection.userId !== req.user.email) {
            return res.status(403).json({ success: false, error: 'Unauthorized access' });
        }
        
        res.status(200).json({ success: true, collection });
    } catch (error) {
        //console.error('Error fetchingweather collection:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch weather collection' });
    }
});

// Delete a saved weather collection
router.delete('/:id', async (req, res) => {
    try {
        const collection = await WeatherCollection.findById(req.params.id);
        if (!collection) {
            return res.status(404).json({ success: false, error: 'Weather collection not found' });
        }
        
        if (collection.userId !== req.user.email) {
            return res.status(403).json({ success: false, error: 'Unauthorized access' });
        }
        
        await WeatherCollection.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        //console.error('Error deleting weather collection:', error);
        res.status(500).json({ success: false, error: 'Failed to delete weather collection' });
    }
});

// Update weather collection title
router.put('/:id/title', async (req, res) => {
    try {
        const collection = await WeatherCollection.findById(req.params.id);
        if (!collection) {
            return res.status(404).json({ success: false, error: 'Weather collection not found' });
        }
        
        if (collection.userId !== req.user.email) {
            return res.status(403).json({ success: false, error: 'Unauthorized access' });
        }

        await WeatherCollection.updateTitle(req.params.id, req.body.title);
        res.status(200).json({ success: true });
    } catch (error) {
        //console.error('Error updating title:', error);
        res.status(400).json({ success: false, error: 'Failed to update title' });
    }
});

// Upload photo for a specific date in a collection
router.post('/:id/photo/:date', upload.single('photo'), async (req, res) => {
    try {
        const collection = await WeatherCollection.findById(req.params.id);
        if (!collection) {
            return res.status(404).json({ success: false, error: 'Weather collection not found' });
        }
        
        if (collection.userId !== req.user.email) {
            return res.status(403).json({ success: false, error: 'Unauthorized access' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        // Convert image buffer to Base64
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        
        // Save Base64 image to MongoDB
        await WeatherCollection.updatePhoto(req.params.id, req.params.date, base64Image);
        
        res.status(200).json({ success: true, photoUrl: base64Image });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(400).json({ success: false, error: 'Failed to upload photo' });
    }
});

// Remove photo for a specific date
router.delete('/:id/photo/:date', async (req, res) => {
    try {
        const collection = await WeatherCollection.findById(req.params.id);
        if (!collection) {
            return res.status(404).json({ success: false, error: 'Weather collection not found' });
        }
        
        if (collection.userId !== req.user.email) {
            return res.status(403).json({ success: false, error: 'Unauthorized access' });
        }

        await WeatherCollection.removePhoto(req.params.id, req.params.date);
        res.status(200).json({ success: true });
    } catch (error) {
        //console.error('Error removing photo:', error);
        res.status(400).json({ success: false, error: 'Failed to remove photo' });
    }
});

module.exports = router; 