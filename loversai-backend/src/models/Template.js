const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    theme: { type: String, required: true, maxlength: 100 },
    functionType: { type: String, default: '' },
    celebrationType: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    images: [{ type: String }],
    description: { type: String, default: '', maxlength: 2000 },
    isActive: { type: Boolean, default: true },
    purchaseCount: { type: Number, default: 0 },
    // Which stages this template pre-fills
    stages: {
      entry:  { images: [String], selectedImage: { type: String, default: null } },
      lounge: { images: [String], selectedImage: { type: String, default: null } },
      dining: { images: [String], selectedImage: { type: String, default: null } },
      bar:    { images: [String], selectedImage: { type: String, default: null } },
      stage:  { images: [String], selectedImage: { type: String, default: null } },
    },
  },
  { timestamps: true }
);

templateSchema.index({ isActive: 1 });
templateSchema.index({ theme: 1 });

module.exports = mongoose.model('Template', templateSchema);
