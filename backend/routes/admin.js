const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Analytics = require('../models/Analytics');
const { adminProtect } = require('../middleware/adminAuth');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'vendora_jwt_secret_key_2024', { expiresIn: '8h' });

// ── Admin Login (separate from vendor login) ────────────────────────────────
// @POST /api/admin/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const vendor = await Vendor.findOne({ email, isAdmin: true });
  if (!vendor) return res.status(401).json({ message: 'Invalid admin credentials' });

  const ok = await vendor.comparePassword(password);
  if (!ok) return res.status(401).json({ message: 'Invalid admin credentials' });

  res.json({
    _id: vendor._id,
    email: vendor.email,
    storeName: vendor.storeName,
    isAdmin: true,
    token: generateToken(vendor._id)
  });
});

// ── Dashboard Stats ─────────────────────────────────────────────────────────
// @GET /api/admin/stats
router.get('/stats', adminProtect, async (req, res) => {
  try {
    const [
      totalVendors,
      activeVendors,
      suspendedVendors,
      totalProducts,
      totalOrders,
      trialVendors,
      paidVendors
    ] = await Promise.all([
      Vendor.countDocuments({ deletedAt: null }),
      Vendor.countDocuments({ isActive: true, isSuspended: false, deletedAt: null }),
      Vendor.countDocuments({ isSuspended: true }),
      Product.countDocuments(),
      Order.countDocuments(),
      Vendor.countDocuments({ 'subscription.status': 'trial', deletedAt: null }),
      Vendor.countDocuments({ 'subscription.status': 'active', deletedAt: null })
    ]);

    // Revenue estimate from paid vendors
    const starterVendors = await Vendor.countDocuments({ 'subscription.plan': 'starter', 'subscription.status': 'active' });
    const proVendors = await Vendor.countDocuments({ 'subscription.plan': 'pro', 'subscription.status': 'active' });
    const estimatedMRR = (starterVendors * 2500) + (proVendors * 5000);

    // New vendors last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newVendors30d = await Vendor.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, deletedAt: null });

    // Orders last 30 days
    const orders30d = await Order.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    res.json({
      vendors: { total: totalVendors, active: activeVendors, suspended: suspendedVendors, new30d: newVendors30d },
      subscriptions: { trial: trialVendors, paid: paidVendors, starter: starterVendors, pro: proVendors, estimatedMRR },
      content: { totalProducts, totalOrders, orders30d }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── List Vendors ────────────────────────────────────────────────────────────
// @GET /api/admin/vendors?page=1&limit=20&search=&plan=&status=
router.get('/vendors', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, plan, status, suspended } = req.query;
    const filter = { deletedAt: null };

    if (search) {
      filter.$or = [
        { storeName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { storeSlug: { $regex: search, $options: 'i' } }
      ];
    }
    if (plan) filter['subscription.plan'] = plan;
    if (status) filter['subscription.status'] = status;
    if (suspended === 'true') filter.isSuspended = true;

    const skip = (page - 1) * limit;
    const [vendors, total] = await Promise.all([
      Vendor.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Vendor.countDocuments(filter)
    ]);

    // Attach product/order counts
    const enriched = await Promise.all(vendors.map(async v => {
      const [products, orders] = await Promise.all([
        Product.countDocuments({ vendor: v._id }),
        Order.countDocuments({ vendor: v._id })
      ]);
      return { ...v.toObject(), productCount: products, orderCount: orders };
    }));

    res.json({ vendors: enriched, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get Single Vendor ───────────────────────────────────────────────────────
// @GET /api/admin/vendors/:id
router.get('/vendors/:id', adminProtect, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const [products, orders, analytics] = await Promise.all([
      Product.find({ vendor: vendor._id }).sort({ createdAt: -1 }).limit(10),
      Order.find({ vendor: vendor._id }).sort({ createdAt: -1 }).limit(10),
      Analytics.find({ vendor: vendor._id }).sort({ date: -1 }).limit(30)
    ]);

    const totalOrders = await Order.countDocuments({ vendor: vendor._id });
    const totalProducts = await Product.countDocuments({ vendor: vendor._id });

    res.json({ vendor, products, orders, analytics, stats: { totalOrders, totalProducts } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Suspend / Unsuspend Vendor ──────────────────────────────────────────────
// @PATCH /api/admin/vendors/:id/suspend
router.patch('/vendors/:id/suspend', adminProtect, async (req, res) => {
  try {
    const { suspend, reason } = req.body;
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      {
        isSuspended: !!suspend,
        isActive: !suspend,
        suspendedReason: suspend ? (reason || 'Suspended by admin') : ''
      },
      { new: true }
    ).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ message: `Vendor ${suspend ? 'suspended' : 'reinstated'}`, vendor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Override Subscription ───────────────────────────────────────────────────
// @PATCH /api/admin/vendors/:id/subscription
router.patch('/vendors/:id/subscription', adminProtect, async (req, res) => {
  try {
    const { plan, status, daysFromNow } = req.body;
    const update = {};
    if (plan) update['subscription.plan'] = plan;
    if (status) update['subscription.status'] = status;
    if (daysFromNow !== undefined) {
      update['subscription.expiresAt'] = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    }
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ message: 'Subscription updated', subscription: vendor.subscription });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Impersonate Vendor (generate short-lived token) ────────────────────────
// @POST /api/admin/vendors/:id/impersonate
router.post('/vendors/:id/impersonate', adminProtect, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).select('-password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    // 1-hour impersonation token
    const token = jwt.sign(
      { id: vendor._id, impersonatedBy: req.vendor._id },
      process.env.JWT_SECRET || 'vendora_jwt_secret_key_2024',
      { expiresIn: '1h' }
    );
    res.json({ token, vendor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Delete Vendor (soft delete) ─────────────────────────────────────────────
// @DELETE /api/admin/vendors/:id
router.delete('/vendors/:id', adminProtect, async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date(), isActive: false },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Optionally hide all their products
    await Product.updateMany({ vendor: req.params.id }, { isVisible: false });

    res.json({ message: 'Vendor soft-deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Platform-wide recent orders ─────────────────────────────────────────────
// @GET /api/admin/orders?page=1&limit=20
router.get('/orders', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [orders, total] = await Promise.all([
      Order.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('vendor', 'storeName storeSlug'),
      Order.countDocuments()
    ]);
    res.json({ orders, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
