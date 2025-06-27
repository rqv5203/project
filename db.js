console.log("Try programiz.pro");

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

let db = null;

async function connectDB() {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        db = client.db();
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("Could not connect to MongoDB", err);
    }
}

function getDB() {
    if (!db){
        throw new Error('DB not connected. Please call connectDB first.');
    }
    return db;
}

module.exports = { connectDB, getDB };