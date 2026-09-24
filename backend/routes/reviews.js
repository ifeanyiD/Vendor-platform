const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { protect } = require('../middleware/auth');

// @POST /api/reviews — public, customer submits
router.post('/', async (req, res) => {
  try {
    const { vendorId, productId, customerName, customerPhone, rating, comment } = req.body;
    if (!vendorId || !customerName || !rating) {
      return res.status(400).json({ message: 'vendorId, customerName, rating required' });
    }
    const review = await Review.create({
      vendor: vendorId, product: productId || null,
      customerName, customerPhone, rating, comment
    });
    res.status(201).json({ message: 'Review submitted and awaiting approval', review });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// @GET /api/reviews/store/:slug — public, approved reviews for a store
router.get('/store/:slug', async (req, res) => {
  try {
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findOne({ storeSlug: req.params.slug });
    if (!vendor) return res.status(404).json({ message: 'Store not found' });

    const reviews = await Review.find({ vendor: vendor._id, isApproved: true, isVisible: true })
      .sort({ createdAt: -1 })
      .populate('product', 'name');

    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    res.json({ reviews, averageRating: avg, total: reviews.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// @GET /api/reviews — vendor's own reviews (protected)
router.get('/', protect, async (req, res) => {
  try {
    const reviews = await Review.find({ vendor: req.vendor._id })
      .sort({ createdAt: -1 })
      .populate('product', 'name');
    res.json(reviews);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// @PATCH /api/reviews/:id/approve — vendor approves/hides
router.patch('/:id/approve', protect, async (req, res) => {
  try {
    const { isApproved, isVisible } = req.body;
    const update = {};
    if (isApproved !== undefined) update.isApproved = isApproved;
    if (isVisible !== undefined) update.isVisible = isVisible;
    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, vendor: req.vendor._id },
      update,
      { new: true }
    );
    if (!review) return res.status(404).json({ message: 'Not found' });
    res.json(review);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
