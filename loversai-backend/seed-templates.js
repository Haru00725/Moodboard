/**
 * Seed sample templates into the database.
 * Run once: node seed-templates.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Template = require('./src/models/Template');

const TEMPLATES = [
  {
    title: 'Royal Palace Wedding',
    theme: 'Royal',
    functionType: 'Shaadi',
    celebrationType: 'Palace',
    price: 499,
    description: 'Opulent palace wedding with gold accents, crystal chandeliers, and cascading florals.',
    images: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600',
    ],
    isActive: true,
  },
  {
    title: 'Boho Garden Sangeet',
    theme: 'Boho',
    functionType: 'Sangeet',
    celebrationType: 'Open Lawn',
    price: 399,
    description: 'Free-spirited garden sangeet with macrame, pampas grass, and fairy lights under the stars.',
    images: [
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600',
      'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=600',
    ],
    isActive: true,
  },
  {
    title: 'Minimal Elegance Reception',
    theme: 'Minimal',
    functionType: 'Reception',
    celebrationType: 'Banquet',
    price: 599,
    description: 'Clean, modern reception with white florals, glass accents, and soft candlelight.',
    images: [
      'https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=600',
      'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=600',
    ],
    isActive: true,
  },
  {
    title: 'Traditional Haldi Ceremony',
    theme: 'Traditional',
    functionType: 'Haldi',
    celebrationType: 'Heritage Haveli',
    price: 349,
    description: 'Vibrant haldi with marigold garlands, brass accents, rangoli, and golden drapes.',
    images: [
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600',
      'https://images.unsplash.com/photo-1600195077909-46e573870d99?w=600',
    ],
    isActive: true,
  },
  {
    title: 'Pastel Beach Wedding',
    theme: 'Pastel',
    functionType: 'Shaadi',
    celebrationType: 'Beach',
    price: 449,
    description: 'Dreamy beach ceremony with soft blush tones, chiffon drapes, and ocean backdrop.',
    images: [
      'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=600',
      'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?w=600',
    ],
    isActive: true,
  },
  {
    title: 'Art Deco Mehendi Night',
    theme: 'Art Deco',
    functionType: 'Mehendi',
    celebrationType: 'Resort',
    price: 499,
    description: 'Glamorous mehendi with geometric patterns, gold accents, and 1920s-inspired decor.',
    images: [
      'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=600',
      'https://images.unsplash.com/photo-1522413452208-996ff3f3e740?w=600',
    ],
    isActive: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check existing count
    const existing = await Template.countDocuments();
    if (existing > 0) {
      console.log(`${existing} templates already exist. Skipping seed.`);
    } else {
      const result = await Template.insertMany(TEMPLATES);
      console.log(`Seeded ${result.length} templates successfully!`);
    }

    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
