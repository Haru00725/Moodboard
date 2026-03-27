require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Give test user 10 credits
  const result = await mongoose.connection.db.collection('users').updateOne(
    { email: 'testuser@loversai.com' },
    { $set: { credits: 10 } }
  );
  console.log('Credits updated:', result.modifiedCount);

  // Reset any stuck moodboards (isGenerating = true)
  const resetResult = await mongoose.connection.db.collection('moodboards').updateMany(
    { isGenerating: true },
    { $set: { isGenerating: false, generatingStage: null } }
  );
  console.log('Stuck moodboards reset:', resetResult.modifiedCount);

  await mongoose.disconnect();
  console.log('Done!');
})();
