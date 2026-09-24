const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const vendorSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },

  // Store Profile
  storeName: { type: String, required: true, trim: true },
  storeSlug: { type: String, unique: true, lowercase: true },
  storeDescription: { type: String, default: '' },
  storeCategory: {
    type: String,
    enum: ['Fashion', 'Food & Drinks', 'Electronics', 'Beauty', 'Home & Living', 'Agriculture', 'Services', 'Others'],
    default: 'Others'
  },
  storeLogo: { type: String, default: '' },
  storeBanner: { type: String, default: '' },
  whatsappNumber: { type: String, required: true, trim: true },
  location: { type: String, default: '' },

  // Custom domain
  customDomain: { type: String, default: '', lowercase: true, trim: true },
  customDomainVerified: { type: Boolean, default: false },

  // Subscription
  subscription: {
    plan: { type: String, enum: ['free', 'starter', 'pro'], default: 'free' },
    status: { type: String, enum: ['active', 'expired', 'trial'], default: 'trial' },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
  },

  // Store theme
  storeTheme: {
    type: String,
    enum: ['default', 'midnight', 'terracotta', 'ocean', 'forest'],
    default: 'default'
  },

  // Email verification
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },

  // Refresh tokens (array so multiple devices are supported)
  refreshTokens: [{ type: String }],

  // Admin flags
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  suspendedReason: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false },

  // Referral
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
  referralCount: { type: Number, default: 0 },

  // Stats cache
  totalOrders: { type: Number, default: 0 },
  totalProducts: { type: Number, default: 0 },

  deletedAt: { type: Date, default: null }
}, { timestamps: true });

vendorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

vendorSchema.methods.comparePassword = async function(pw) {
  return bcrypt.compare(pw, this.password);
};

module.exports = mongoose.model('Vendor', vendorSchema);
