/**
 * Seed sample templates into the database.
 * Run once: node seed-templates.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Template = require('./src/models/Template');

const TEMPLATES = [
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    title: 'Dining Setup',
    theme: 'Elegant Dining',
    functionType: 'Reception',
    celebrationType: 'Banquet',
    price: 999,
    description: 'A beautifully arranged dining setup perfect for wedding receptions.',
    images: [
      'https://images.unsplash.com/photo-1526772669205-e1a5ad90b131?w=600',
      'https://images.unsplash.com/photo-1519671482677-756d4b5968d0?w=600',
    ],
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
    title: 'Mehendi Celebration',
    theme: 'Traditional Mehendi',
    functionType: 'Mehendi',
    celebrationType: 'Heritage',
    price: 999,
    description: 'Vibrant traditional mehendi celebration with festive decorations.',
    images: [
      'https://images.unsplash.com/photo-1600195077909-46e573870d99?w=600',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600',
    ],
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
    title: 'Myra Wedding',
    theme: 'Modern Elegance',
    functionType: 'Shaadi',
    celebrationType: 'Palace',
    price: 999,
    description: 'Modern and elegant wedding theme for sophisticated celebrations.',
    images: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600',
    ],
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
    title: 'Neon Sangeet Night',
    theme: 'Contemporary Vibes',
    functionType: 'Sangeet',
    celebrationType: 'Open Lawn',
    price: 999,
    description: 'Contemporary sangeet night with vibrant neon vibes and modern setup.',
    images: [
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600',
      'https://images.unsplash.com/photo-1522413452208-996ff3f3e740?w=600',
    ],
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439015'),
    title: 'Strada Global Collection',
    theme: 'International Fusion',
    functionType: 'Reception',
    celebrationType: 'Resort',
    price: 999,
    description: 'A fusion of international styles bringing global elegance to your celebration.',
    images: [
      'https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=600',
      'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=600',
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
