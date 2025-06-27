const { getDB } = require('../db');
const { v4: uuidv4 } = require('uuid');

class WeatherCollection {
    constructor(collectionData) {
        this.id = collectionData.id || uuidv4();
        this.title = collectionData.title || 'Untitled Collection';
        this.userId = collectionData.userId;
        this.startDate = collectionData.startDate;
        this.endDate = collectionData.endDate;
        this.location = collectionData.location;
        this.weatherData = collectionData.weatherData;
        this.photos = collectionData.photos || {}; // Object with date as key and photo URL as value
        this.createdAt = collectionData.createdAt || new Date();
        this.updatedAt = collectionData.updatedAt || new Date();
    }

    static async findById(id) {
        const db = getDB();
        return await db.collection('weatherCollections').findOne({ id });
    }

    static async findByUserId(userId) {
        const db = getDB();
        return await db.collection('weatherCollections').find({ userId }).sort({ createdAt: -1 }).toArray();
    }

    async save() {
        const db = getDB();
        const existingCollection = await WeatherCollection.findById(this.id);

        if (existingCollection) {
            // Update existing collection
            this.updatedAt = new Date();
            const result = await db.collection('weatherCollections').updateOne(
                { id: this.id },
                { 
                    $set: {
                        title: this.title,
                        startDate: this.startDate,
                        endDate: this.endDate,
                        location: this.location,
                        weatherData: this.weatherData,
                        photos: this.photos,
                        updatedAt: this.updatedAt
                    }
                }
            );
            return result;
        } else {
            // Insert new collection
            const result = await db.collection('weatherCollections').insertOne(this);
            return result;
        }
    }

    static async createIndexes() {
        const db = getDB();
        await db.collection('weatherCollections').createIndex({ id: 1 }, { unique: true });
        await db.collection('weatherCollections').createIndex({ userId: 1 });
        await db.collection('weatherCollections').createIndex({ startDate: 1 });
        await db.collection('weatherCollections').createIndex({ endDate: 1 });
    }

    // Delete a weather collection
    static async delete(id) {
        const db = getDB();
        return await db.collection('weatherCollections').deleteOne({ id });
    }

    // Update collection title
    static async updateTitle(id, title) {
        const db = getDB();
        return await db.collection('weatherCollections').updateOne(
            { id },
            { 
                $set: { 
                    title,
                    updatedAt: new Date()
                }
            }
        );
    }

    // Add or update photo for a specific date
    static async updatePhoto(id, date, photoUrl) {
        const db = getDB();
        return await db.collection('weatherCollections').updateOne(
            { id },
            { 
                $set: { 
                    [`photos.${date}`]: photoUrl,
                    updatedAt: new Date()
                }
            }
        );
    }

    // Remove photo for a specific date
    static async removePhoto(id, date) {
        const db = getDB();
        return await db.collection('weatherCollections').updateOne(
            { id },
            { 
                $unset: { 
                    [`photos.${date}`]: ""
                },
                $set: {
                    updatedAt: new Date()
                }
            }
        );
    }
}

module.exports = WeatherCollection; 