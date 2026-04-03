/**
 * LoversAI Pipeline Test Script
 * Tests the Groq + BFL Flux image generation pipeline end-to-end.
 *
 * Usage:
 *   node test-pipeline.js [venue-image-path] [decor-image-path]
 *
 * Example:
 *   node test-pipeline.js ./test-venue.png ./test-decor.png
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

// ── Config Check ──
console.log('\n═══════════════════════════════════════════════');
console.log('  LoversAI Pipeline — Pre-flight Check');
console.log('═══════════════════════════════════════════════\n');

const checks = {
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_VISION_MODEL: process.env.GROQ_VISION_MODEL,
  BFL_API_KEY: process.env.BFL_API_KEY,
  FLUX_POLL_INTERVAL_MS: process.env.FLUX_POLL_INTERVAL_MS,
  FLUX_POLL_TIMEOUT_MS: process.env.FLUX_POLL_TIMEOUT_MS,
};

let allGood = true;
for (const [key, value] of Object.entries(checks)) {
  const status = value ? '✅' : '❌ MISSING';
  const display = value ? (key.includes('KEY') ? value.slice(0, 8) + '...' : value) : '(empty)';
  console.log(`  ${status}  ${key} = ${display}`);
  if (!value && (key === 'GROQ_API_KEY' || key === 'BFL_API_KEY')) {
    allGood = false;
  }
}

if (!allGood) {
  console.log('\n❌ FATAL: Missing required API keys in .env');
  console.log('   Please set GROQ_API_KEY and BFL_API_KEY in your .env file.');
  console.log('   Get Groq key: https://console.groq.com/keys');
  console.log('   Get BFL key:  https://api.bfl.ai/');
  process.exit(1);
}

console.log('\n✅ All config checks passed!\n');

// ── Load test images ──
const venueImagePath = process.argv[2];
const decorImagePath = process.argv[3];

let venueImageBase64 = null;
let decorImageBase64 = null;

if (venueImagePath && fs.existsSync(venueImagePath)) {
  venueImageBase64 = fs.readFileSync(venueImagePath).toString('base64');
  console.log(`📸 Venue image loaded: ${venueImagePath} (${(venueImageBase64.length / 1024).toFixed(0)} KB base64)`);
} else {
  console.log('⚠️  No venue image provided (pass as argv[2])');
}

if (decorImagePath && fs.existsSync(decorImagePath)) {
  decorImageBase64 = fs.readFileSync(decorImagePath).toString('base64');
  console.log(`🎨 Decor image loaded: ${decorImagePath} (${(decorImageBase64.length / 1024).toFixed(0)} KB base64)`);
} else {
  console.log('⚠️  No decor image provided (pass as argv[3])');
}

// ── Test ──
const aiService = require('./src/services/ai.service');

const moodboardConfig = {
  stage: 'entry',
  functionType: 'Haldi',
  theme: 'Traditional',
  celebrationType: 'Banquet',
  timeOfDay: 'Daytime',
  vibeDescription: 'Grand Haldi ceremony with marigold and yellow floral decoration in Fairmont Mumbai ballroom',
  venueImageBase64,
  decorImageBase64,
};

console.log('\n═══════════════════════════════════════════════');
console.log('  Starting Pipeline Test (1 image only)');
console.log('═══════════════════════════════════════════════');
console.log(`  Stage: ${moodboardConfig.stage}`);
console.log(`  Function: ${moodboardConfig.functionType}`);
console.log(`  Theme: ${moodboardConfig.theme}`);
console.log(`  Has venue image: ${!!venueImageBase64}`);
console.log(`  Has decor image: ${!!decorImageBase64}`);
console.log('═══════════════════════════════════════════════\n');

const startTime = Date.now();

aiService.generateImages(moodboardConfig, 1)
  .then((results) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n═══════════════════════════════════════════════');
    console.log(`  ✅ SUCCESS — ${elapsed}s elapsed`);
    console.log('═══════════════════════════════════════════════\n');
    results.forEach((img, i) => {
      console.log(`  Image ${i + 1}:`);
      console.log(`    Label: ${img.label}`);
      console.log(`    URL:   ${img.url}`);
    });
    console.log('\n🎉 Pipeline works! You can now generate from the UI.\n');
    process.exit(0);
  })
  .catch((err) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error('\n═══════════════════════════════════════════════');
    console.error(`  ❌ FAILED — ${elapsed}s elapsed`);
    console.error('═══════════════════════════════════════════════\n');
    console.error(`  Error: ${err.message}`);
    console.error(`  Code:  ${err.code || 'UNKNOWN'}`);
    if (err.response?.data) {
      console.error(`  API Response: ${JSON.stringify(err.response.data).slice(0, 500)}`);
    }
    console.error('');
    process.exit(1);
  });
