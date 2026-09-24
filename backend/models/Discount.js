const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },        // % or ₦
  minOrder: { type: Number, default: 0 },
  maxUses: { type: Number, default: null },                // null = unlimited
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Unique per vendor
discountSchema.index({ vendor: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Discount', discountSchema);
