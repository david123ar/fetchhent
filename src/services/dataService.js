const { getDocument, updateDocument } = require('../models/dataModel');

async function addOrUpdateDocument(collectionName, docId, newData) {
  try {
    const existingData = await getDocument(collectionName, docId);

    if (existingData && existingData.banner && existingData.banner.trim() !== '') {
      console.log(`Document ${docId} has a non-empty banner. Skipping...`);
      return;
    }

    await updateDocument(collectionName, docId, newData);
    console.log(`Document ${docId} successfully updated!`);
  } catch (error) {
    console.error(`Error writing document ${docId}:`, error);
  }
}

// ✅ Fix: export both functions
module.exports = {
  addOrUpdateDocument,
  getDocument
};
