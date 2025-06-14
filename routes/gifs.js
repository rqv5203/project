const express = require('express');
const router = express.Router();
const Gif = require('../models/Gif');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// Save a GIF
router.post('/save', async (req, res) => {
    try {
        const gifData = {
            id: req.body.id,
            title: req.body.title,
            url: req.body.url,
            preview: req.body.preview,
            userId: req.user.email,
            tags: req.body.tags || [],
            caption: req.body.caption || ''
        };

        const gif = new Gif(gifData);
        const result = await gif.save();
        res.status(201).json({ success: true, gif: result });
    } catch (error) {
        console.error('Error saving GIF:', error);
        res.status(400).json({ success: false, error: 'Failed to save GIF' });
    }
});

// Get user's saved GIFs
router.get('/user/:userId', async (req, res) => {
    try {
        if (req.params.userId !== req.user.email) {
            return res.status(403).json({ success: false, error: 'Unauthorized access' });
        }
        
        const gifs = await Gif.findByUserId(req.user.email);
        res.status(200).json({ success: true, gifs });
    } catch (error) {
        console.error('Error fetching user GIFs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch GIFs' });
    }
});

// Delete a saved GIF
router.delete('/:id', async (req, res) => {
    try {
        const gif = await Gif.findById(req.params.id);
        if (!gif) {
            return res.status(404).json({ success: false, error: 'GIF not found' });
        }
        
        if (gif.userId !== req.user.email) {
            return res.status(403).json({ success: false, error: 'Unauthorized access' });
        }
        
        await Gif.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting GIF:', error);
        res.status(500).json({ success: false, error: 'Failed to delete GIF' });
    }
});

// Update GIF caption
router.put('/:id/caption', async (req, res) => {
    try {
        const gif = await Gif.findById(req.params.id);
        if (!gif) {
            return res.status(404).json({ success: false, error: 'GIF not found' });
        }
        
        if (gif.userId !== req.user.email) {
            return res.status(403).json({ success: false, error: 'Unauthorized access' });
        }

        await Gif.updateCaption(req.params.id, req.body.caption);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error updating caption:', error);
        res.status(400).json({ success: false, error: 'Failed to update caption' });
    }
});

module.exports = router; 