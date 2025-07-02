require('dotenv-flow').config(); // Better than dotenv

console.log("Mongo URI:", process.env.MONGO_URI); // Confirm it's there

const { MongoClient } = require("mongodb");
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;

async function connectToDb() {
  if (!db) {
    await client.connect();
    db = client.db('mydatabase');
  }
  return db;
}

module.exports = { connectToDb };
