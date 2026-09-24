const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');

// @GET /api/store/:slug — public store page data
router.get('/:slug', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      storeSlug: req.params.slug,
      isActive: true
    }).select('-password -email -__v');

    
    if (!vendor) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const products = await Product.find({
      vendor: vendor._id,
      isVisible: true
    }).sort({ sortOrder: 1, createdAt: -1 });

    res.json({ vendor, products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
