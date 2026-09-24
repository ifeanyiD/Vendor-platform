const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  storeViews: { type: Number, default: 0 },
  whatsappTaps: { type: Number, default: 0 },
  // per-product taps: { productId: count }
  productTaps: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

// Compound unique index: one doc per vendor per day
analyticsSchema.index({ vendor: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Analytics', analyticsSchema);
