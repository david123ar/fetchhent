const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;

async function connectToDb() {
  if (!db) {
    await client.connect();
    db = client.db('mydatabase'); // Replace with your database name
  }
  return db;
}

module.exports = { connectToDb };
