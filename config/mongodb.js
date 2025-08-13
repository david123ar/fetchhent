const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri =
  "mongodb://root:Imperial_king2004@31.97.122.33:27017/?authSource=admin";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db;

async function connectToDb() {
  if (!db) {
    await client.connect();
    db = client.db("mydatabase"); // Replace with your database name
  }
  return db;
}

module.exports = { connectToDb };
