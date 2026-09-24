const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const PasswordReset = require('../models/PasswordReset');
const { sendPasswordResetEmail } = require('../services/emailService');


// @POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const vendor = await Vendor.findOne({ email: email.toLowerCase() });

    // Always respond 200 to prevent email enumeration
    if (!vendor) {
      return res.json({ message: 'If this email exists, a reset link has been sent.' });
    }

    // Delete any existing tokens for this vendor
    await PasswordReset.deleteMany({ vendor: vendor._id });

    const token = PasswordReset.generateToken();
    await PasswordReset.create({ vendor: vendor._id, token });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail({
      email: vendor.email,
      storeName: vendor.storeName,
      resetUrl
    });

    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const resetDoc = await PasswordReset.findOne({ token });
    if (!resetDoc) {
      return res.status(400).json({ message: 'Invalid or expired reset link' });
    }

    const vendor = await Vendor.findById(resetDoc.vendor);
    if (!vendor) return res.status(400).json({ message: 'Vendor not found' });

    vendor.password = password; // pre-save hook will hash it
    await vendor.save();
    await PasswordReset.deleteMany({ vendor: vendor._id });

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
