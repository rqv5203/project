const { getDB } = require('../db');

class Gif {
    constructor(gifData) {
        this.id = gifData.id;                    // Giphy ID
        this.title = gifData.title;              // GIF title
        this.url = gifData.url;                  // GIF URL
        this.preview = gifData.preview;          // Preview URL
        this.userId = gifData.userId;            // User who saved the GIF
        this.savedAt = gifData.savedAt || new Date();
        this.tags = gifData.tags || [];          // Array of tags
        this.caption = gifData.caption || '';    // Caption for meme
    }

    static async findById(id) {
        const db = getDB();
        return await db.collection('gifs').findOne({ id });
    }

    static async findByUserId(userId) {
        const db = getDB();
        return await db.collection('gifs').find({ userId }).toArray();
    }

    async save() {
        const db = getDB();
        const existingGif = await Gif.findById(this.id);

        if (existingGif) {
            // Update existing gif
            const result = await db.collection('gifs').updateOne(
                { id: this.id },
                { 
                    $set: {
                        title: this.title,
                        url: this.url,
                        preview: this.preview,
                        tags: this.tags,
                        caption: this.caption,
                        updatedAt: new Date()
                    }
                }
            );
            return result;
        } else {
            // Insert new gif
            const result = await db.collection('gifs').insertOne(this);
            return result;
        }
    }

    static async createIndexes() {
        const db = getDB();
        await db.collection('gifs').createIndex({ id: 1 }, { unique: true });
        await db.collection('gifs').createIndex({ userId: 1 });
        await db.collection('gifs').createIndex({ tags: 1 });
    }

    // Delete a gif
    static async delete(id) {
        const db = getDB();
        return await db.collection('gifs').deleteOne({ id });
    }

    // Search gifs by tag
    static async findByTag(tag) {
        const db = getDB();
        return await db.collection('gifs').find({ tags: tag }).toArray();
    }

    // Update caption
    static async updateCaption(id, caption) {
        const db = getDB();
        return await db.collection('gifs').updateOne(
            { id },
            { 
                $set: { 
                    caption,
                    updatedAt: new Date()
                }
            }
        );
    }
}

module.exports = Gif; 