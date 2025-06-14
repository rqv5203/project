const { getDB } = require('../db');

class User {
    constructor(userData) {
        this.email = userData.email;
        this.name = userData.name;
        this.picture = userData.picture;
        this.provider = userData.provider; // 'google' or 'linkedin'
        this.providerId = userData.providerId;
        this.lastLogin = new Date();
        this.createdAt = userData.createdAt || new Date();
    }

    static async findByEmail(email) {
        const db = getDB();
        return await db.collection('users').findOne({ email });
    }

    static async findByProviderId(providerId) {
        const db = getDB();
        return await db.collection('users').findOne({ providerId });
    }

    async save() {
        const db = getDB();
        const existingUser = await User.findByEmail(this.email);

        if (existingUser) {
            // Update existing user
            const result = await db.collection('users').updateOne(
                { email: this.email },
                { 
                    $set: {
                        name: this.name,
                        picture: this.picture,
                        lastLogin: this.lastLogin
                    }
                }
            );
            return result;
        } else {
            // Insert new user
            const result = await db.collection('users').insertOne(this);
            return result;
        }
    }

    static async createIndexes() {
        const db = getDB();
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ providerId: 1 });
    }
}

module.exports = User; 