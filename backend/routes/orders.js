const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { sendOrderNotificationEmail } = require('../services/emailService');
const { trackWhatsAppTap } = require('../services/analyticsService');

// @POST /api/orders — record an order (called when customer taps WhatsApp)
router.post('/', async (req, res) => {
  try {
    const { productId, vendorId } = req.body;

    const product = await Product.findOne({ _id: productId, vendor: vendorId });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const order = await Order.create({
      vendor: vendorId,
      product: productId,
      productName: product.name,
      productPrice: product.price,
      productImage: product.images?.[0] || ''
    });

    // Track analytics
    await trackWhatsAppTap(vendorId, productId);

    // Email vendor (non-blocking)
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findById(vendorId).select('email storeName');
    if (vendor) {
      sendOrderNotificationEmail({
        vendorEmail: vendor.email,
        storeName: vendor.storeName,
        order
      }).catch(() => {});
    }

    res.status(201).json({ message: 'Order recorded', orderId: order._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/orders — vendor's orders
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { vendor: req.vendor._id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('product', 'name images');

    const total = await Order.countDocuments(filter);

    res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PATCH /api/orders/:id/status — update order status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, vendor: req.vendor._id },
      { status },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
