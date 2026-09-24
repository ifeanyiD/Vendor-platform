const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  // Snapshot at time of order
  productName: { type: String, required: true },
  productPrice: { type: Number, required: true },
  productImage: { type: String, default: '' },

  // Customer info (captured when they tap WhatsApp)
  customerNote: { type: String, default: '' },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },

  // WhatsApp channel reference
  channel: { type: String, default: 'whatsapp' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
