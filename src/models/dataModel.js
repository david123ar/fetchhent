const { connectToDb } = require('../../config/mongodb');

async function getDocument(collectionName, docId) {
  const db = await connectToDb();
  const collection = db.collection(collectionName);
  return collection.findOne({ _id: docId });
}

async function updateDocument(collectionName, docId, data) {
  const db = await connectToDb();
  const collection = db.collection(collectionName);
  return collection.updateOne({ _id: docId }, { $set: data }, { upsert: true });
}

module.exports = { getDocument, updateDocument };
