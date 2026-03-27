/**
 * Fix script: Drop the stale googleId_1 unique index that causes
 * duplicate key errors when multiple users have null googleId.
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndex() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;
  const collection = db.collection('users');

  // List existing indexes
  const indexes = await collection.indexes();
  console.log('Current indexes:', JSON.stringify(indexes.map(i => ({ name: i.name, key: i.key, unique: i.unique, sparse: i.sparse })), null, 2));

  // Drop the googleId_1 index if it exists
  const googleIdIndex = indexes.find(i => i.name === 'googleId_1');
  if (googleIdIndex) {
    console.log('Dropping stale googleId_1 index...');
    await collection.dropIndex('googleId_1');
    console.log('Index dropped successfully!');
  } else {
    console.log('No googleId_1 index found, nothing to drop.');
  }

  // Verify
  const newIndexes = await collection.indexes();
  console.log('Updated indexes:', JSON.stringify(newIndexes.map(i => ({ name: i.name, key: i.key })), null, 2));

  await mongoose.disconnect();
  console.log('Done!');
}

fixIndex().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
