const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const { protect } = require('../middleware/auth');
const {
  initializeTransaction,
  verifyTransaction,
  validateWebhook,
  getPlanDuration,
  PLANS
} = require('../services/paystackService');
const { sendSubscriptionEmail } = require('../services/emailService');

// @GET /api/payments/plans — list available plans
router.get('/plans', (req, res) => {
  const plans = Object.entries(PLANS).map(([key, val]) => ({
    id: key,
    name: val.name,
    amount: val.amount / 100, // convert kobo to naira
    interval: val.interval,
    currency: 'NGN'
  }));
  res.json(plans);
});

// @POST /api/payments/initialize — start a payment
router.post('/initialize', protect, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    const data = await initializeTransaction({
      email: req.vendor.email,
      plan,
      vendorId: req.vendor._id.toString(),
      callbackUrl: `${process.env.CLIENT_URL}/dashboard?payment=success&plan=${plan}`
    });

    res.json(data); // { authorization_url, access_code, reference }
  } catch (err) {
    console.error('[PAYMENT] initialize error:', err.message);
    res.status(500).json({ message: 'Payment initialization failed', error: err.message });
  }
});

// @GET /api/payments/verify/:reference — verify after redirect
router.get('/verify/:reference', protect, async (req, res) => {
  try {
    const data = await verifyTransaction(req.params.reference);

    if (data.status !== 'success') {
      return res.status(400).json({ message: 'Payment not successful', status: data.status });
    }

    const { plan, vendorId } = data.metadata;

    // Validate ownership
    if (vendorId !== req.vendor._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const expiresAt = new Date(Date.now() + getPlanDuration(plan));

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        'subscription.plan': plan,
        'subscription.status': 'active',
        'subscription.expiresAt': expiresAt
      },
      { new: true }
    );

    await sendSubscriptionEmail({
      email: vendor.email,
      storeName: vendor.storeName,
      plan,
      expiresAt
    });

    res.json({ message: 'Subscription activated', subscription: vendor.subscription });
  } catch (err) {
    console.error('[PAYMENT] verify error:', err.message);
    res.status(500).json({ message: 'Verification failed', error: err.message });
  }
});

// @POST /api/payments/webhook — Paystack webhook (no auth)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const body = req.body;

    if (!validateWebhook(body, signature)) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const event = JSON.parse(body);

    if (event.event === 'charge.success') {
      const { metadata, amount } = event.data;
      const { plan, vendorId } = metadata;

      if (plan && vendorId) {
        const expiresAt = new Date(Date.now() + getPlanDuration(plan));
        const vendor = await Vendor.findByIdAndUpdate(
          vendorId,
          {
            'subscription.plan': plan,
            'subscription.status': 'active',
            'subscription.expiresAt': expiresAt
          },
          { new: true }
        );

        if (vendor) {
          await sendSubscriptionEmail({
            email: vendor.email,
            storeName: vendor.storeName,
            plan,
            expiresAt
          });
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[WEBHOOK] error:', err.message);
    res.sendStatus(200); // Always 200 to Paystack
  }
});

module.exports = router;
