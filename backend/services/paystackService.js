const axios = require('axios');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const BASE_URL = 'https://api.paystack.co';

const paystackAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    'Content-Type': 'application/json'
  }
});

const PLANS = {
  starter: {
    name: 'Vendora Starter',
    amount: 250000, // ₦2,500 in kobo
    interval: 'monthly'
  },
  pro: {
    name: 'Vendora Pro',
    amount: 500000, // ₦5,000 in kobo
    interval: 'monthly'
  }
};

/**
 * Initialize a Paystack transaction
 */
const initializeTransaction = async ({ email, plan, vendorId, callbackUrl }) => {
  const planConfig = PLANS[plan];
  if (!planConfig) throw new Error(`Unknown plan: ${plan}`);

  const res = await paystackAPI.post('/transaction/initialize', {
    email,
    amount: planConfig.amount,
    currency: 'NGN',
    callback_url: callbackUrl || `${process.env.CLIENT_URL}/dashboard?payment=success`,
    metadata: {
      vendorId,
      plan,
      custom_fields: [
        { display_name: 'Plan', variable_name: 'plan', value: plan },
        { display_name: 'Vendor ID', variable_name: 'vendor_id', value: vendorId }
      ]
    }
  });

  return res.data.data; // { authorization_url, access_code, reference }
};

/**
 * Verify a Paystack transaction by reference
 */
const verifyTransaction = async (reference) => {
  const res = await paystackAPI.get(`/transaction/verify/${reference}`);
  return res.data.data; // { status, amount, metadata, ... }
};

/**
 * Validate Paystack webhook signature
 */
const validateWebhook = (body, signature) => {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
  return hash === signature;
};

/**
 * Get subscription duration by plan
 */
const getPlanDuration = (plan) => {
  const durations = { starter: 30, pro: 30 };
  return (durations[plan] || 30) * 24 * 60 * 60 * 1000; // in ms
};

module.exports = {
  initializeTransaction,
  verifyTransaction,
  validateWebhook,
  getPlanDuration,
  PLANS
};
