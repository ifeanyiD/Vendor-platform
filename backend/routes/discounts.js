const express = require('express');
const router = express.Router();
const Discount = require('../models/Discount');
const { protect } = require('../middleware/auth');

// @GET /api/discounts
router.get('/', protect, async (req, res) => {
  try {
    const discounts = await Discount.find({ vendor: req.vendor._id }).sort({ createdAt: -1 });
    res.json(discounts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// @POST /api/discounts
router.post('/', protect, async (req, res) => {
  try {
    const { code, type, value, minOrder, maxUses, expiresAt } = req.body;
    if (!code || !type || value === undefined) {
      return res.status(400).json({ message: 'code, type and value required' });
    }
    const discount = await Discount.create({
      vendor: req.vendor._id,
      code: code.toUpperCase().trim(),
      type, value,
      minOrder: minOrder || 0,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null
    });
    res.status(201).json(discount);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Code already exists in your store' });
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/discounts/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const discount = await Discount.findOneAndUpdate(
      { _id: req.params.id, vendor: req.vendor._id },
      req.body,
      { new: true }
    );
    if (!discount) return res.status(404).json({ message: 'Not found' });
    res.json(discount);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// @DELETE /api/discounts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Discount.findOneAndDelete({ _id: req.params.id, vendor: req.vendor._id });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// @POST /api/discounts/validate — public (customers validate codes)
router.post('/validate', async (req, res) => {
  try {
    const { code, vendorId, orderTotal } = req.body;
    const discount = await Discount.findOne({
      code: code.toUpperCase(),
      vendor: vendorId,
      isActive: true
    });
    if (!discount) return res.status(404).json({ message: 'Invalid discount code' });
    if (discount.expiresAt && discount.expiresAt < new Date()) {
      return res.status(400).json({ message: 'This code has expired' });
    }
    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return res.status(400).json({ message: 'This code has reached its usage limit' });
    }
    if (orderTotal < discount.minOrder) {
      return res.status(400).json({ message: `Minimum order of ₦${discount.minOrder.toLocaleString()} required` });
    }
    const saving = discount.type === 'percentage'
      ? Math.floor(orderTotal * (discount.value / 100))
      : Math.min(discount.value, orderTotal);
    res.json({ valid: true, discount, saving });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
