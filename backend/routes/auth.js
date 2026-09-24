const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const slugify = require('slugify');
const Vendor = require('../models/Vendor');
const { sendVerificationEmail, sendWelcomeEmail, sendReferralBonusEmail} = require("../services/emailService");
const passwordResetRouter = require('./passwordReset');
const { protect } = require('../middleware/auth');

// ── Token helpers ────────────────────────────────────────────────────────────
const JWT_SECRET   = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

// Short-lived access token (15 mi nin production, 1h in dev/test)
const generateAccessToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.NODE_ENV === 'production' ? '15m' : '1h'
});


// Long-lived refresh token (7 days)
const generateRefreshToken = (id) => jwt.sign({ id }, REFRESH_SECRET, { expiresIn: '7d' });

// Secure httpOnly cookie options
const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7d in ms
};

// Strip sensitive fields before sending vendor in response
const safeVendor = (v) => ({
  _id: v._id,
  email: v.email,
  storeName: v.storeName,
  storeSlug: v.storeSlug,
  storeLogo: v.storeLogo,
  subscription: v.subscription,
  isEmailVerified: v.isEmailVerified
});

// @POST /api/auth/register
router.put('/register', async (req, res) => {
  try {
   const { email, password, storeName, whatsappNumber, referralCode } = req.body;
    if (!email || !password || !storeName || !whatsappNumber) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const normalizedEmail = email.toLowerCase();

    // Check existing
    const existing = await Vendor.findOne({ email : normalizedEmail});
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate unique slug
    let baseSlug = slugify(storeName, { lower: true, strict: true });
    
    // OPTIMIZED VERSION
    const count = await Vendor.countDocuments({
      storeSlug: { $regex: `^${baseSlug}` }
    });

    const storeSlug = count ? `${baseSlug}-${count + 1}` : baseSlug;

     // Email verification token (24h TTL)
    const emailVerificationToken  = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const vendor = await Vendor.create({
      email : normalizedEmail,
      password,
      storeName,
      storeSlug,
      whatsappNumber,
      emailVerificationToken,
      emailVerificationExpires,
      isEmailVerified: false,
      refreshTokens: []
    });

    //Generation of real refresh token bound to vendor._id and store it
    const realRefreshToken = generateRefreshToken(vendor._id);
    vendor.refreshTokens = [realRefreshToken];
    await vendor.save();
    
    
    // Referral handling
    if (referralCode) {
      try {
        const referrer = await Vendor.findOne({ referralCode: referralCode.toUpperCase() });
        if (referrer) {
          const bonus = new Date(
              Math.max(
                Date.now(), 
                referrer.subscription?.expiresAt?.getTime() || Date.now())
              );
          bonus.setDate(bonus.getDate() + 30);
          await Vendor.findByIdAndUpdate(referrer._id, { 
            $inc: { referralCount: 1 },
            'subscription.expiresAt': bonus
          });
          await Vendor.findByIdAndUpdate(vendor._id, 
            { referredBy: referrer._id }
          );
          
          sendReferralBonusEmail({ 
            email: referrer.email, 
            storeName: referrer.storeName, 
            referredStore: storeName, 
            bonusDays: 30 
          }).catch(err => {
            console.error("Referral email failed:", err)
          });
        }
      } catch (err){
        console.error("Referral processing failed", err)
      } // non-blocking
    }

     // Send verification email (non-blocking)
    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${emailVerificationToken}`;
    sendVerificationEmail({ email: vendor.email, storeName: vendor.storeName, verifyUrl })
      .catch(err => console.log("Failed to send verification email", err));

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', realRefreshToken, refreshCookieOptions);

    res.status(201).json({
      ...safeVendor(vendor),
      token: generateAccessToken(vendor._id),
      message: 'Account created! Please check your email to verify your address.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await vendor.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (vendor.isSuspended) {
      return res.status(403).json({
        message: 'Account suspended',
        reason: vendor.suspendedReason || 'Contact support for details'
      });
    }
    if (!vendor.isEmailVerified) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before logging in.',
        email: vendor.email
      });
    }

    // Rotate refresh token: remove any expired ones, add new one
    const newRefreshToken = generateRefreshToken(vendor._id);
    const v = vendor.refreshTokens = [
      ...vendor.refreshTokens.filter(t => {
        try { 
          jwt.verify(t, REFRESH_SECRET); 
          return true; 
        } catch { return false; }
      }),
      newRefreshToken
    ].slice(-5); // keep max 5 (5 devices)
    await vendor.save();

    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

    res.json({
      vendor : safeVendor(vendor),
      token: generateAccessToken(vendor._id)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── @POST /api/auth/refresh ───────────────────────────────────────────────────
// Issues a new access token using the httpOnly refresh cookie
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    let decoded;
    try {
      decoded = jwt.verify(token, REFRESH_SECRET);
    } catch {
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Refresh token expired or invalid' });
    }

    const vendor = await Vendor.findById(decoded.id);
    if (!vendor) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Vendor not found' });
    }

    // Check token is in vendor's allowed list (rotation check)
    if (!vendor.refreshTokens.includes(token)) {
      // Possible token reuse — clear all tokens (security measure)
      vendor.refreshTokens = [];
      await vendor.save();
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Refresh token reuse detected. Please log in again.' });
    }

    // Rotate: issue new refresh token
    const newRefreshToken = generateRefreshToken(vendor._id);
    vendor.refreshTokens = vendor.refreshTokens
      .filter(t => t !== token && (() => { 
        try { 
          jwt.verify(t, REFRESH_SECRET); return true; 
        } catch { return false; } })())
      .concat(newRefreshToken)
      .slice(-5);
    await vendor.save();

    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

    res.json({
      token: generateAccessToken(vendor._id),
      vendor: safeVendor(vendor)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── @POST /api/auth/logout ────────────────────────────────────────────────────
// Invalidates the specific refresh token used
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, REFRESH_SECRET);
        await Vendor.findByIdAndUpdate(decoded.id, {
          $pull: { refreshTokens: token }
        });
      } catch {} // token already expired — fine
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── @POST /api/auth/logout-all ────────────────────────────────────────────────
// Logs out all devices (clears all refresh tokens)
router.post('/logout-all', protect, async (req, res) => {
  try {
    await Vendor.findByIdAndUpdate(req.vendor._id, { refreshTokens: [] });
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── @GET /api/auth/verify-email ───────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Token required' });

    const vendor = await Vendor.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!vendor) {
      return res.status(400).json({
        code: 'TOKEN_INVALID',
        message: 'This verification link is invalid or has expired.'
      });
    }

    if (vendor.isEmailVerified) {
      return res.json({ message: 'Email already verified. You can log in.' });
    }

    vendor.isEmailVerified          = true;
    vendor.emailVerificationToken   = null;
    vendor.emailVerificationExpires = null;
    await vendor.save();

    // Send welcome email now that email is confirmed
    sendWelcomeEmail({ email: vendor.email, storeName: vendor.storeName, storeSlug: vendor.storeSlug }).catch(() => {});

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── @POST /api/auth/resend-verification ──────────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const vendor = await Vendor.findOne({ email: email.toLowerCase() });

    // Always 200 to prevent email enumeration
    if (!vendor || vendor.isEmailVerified) {
      return res.json({ message: 'If this email exists and is unverified, a new link has been sent.' });
    }

    // Rate-limit: don't spam — only resend if last token is > 2 min old
    if (vendor.emailVerificationExpires) {
      const originalSentAt = new Date(vendor.emailVerificationExpires.getTime() - 24 * 60 * 60 * 1000);
      const minutesSinceSent = (Date.now() - originalSentAt) / 60000;
      if (minutesSinceSent < 2) {
        return res.status(429).json({ message: 'Please wait a moment before requesting another link.' });
      }
    }

    const newToken   = crypto.randomBytes(32).toString('hex');
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    vendor.emailVerificationToken   = newToken;
    vendor.emailVerificationExpires = newExpires;
    await vendor.save();

    const verifyUrl = `process.env.CLIENT_URL/verify-email?token=${newToken}`;
    sendVerificationEmail({ email: vendor.email, storeName: vendor.storeName, verifyUrl }).catch(() => {});

    res.json({ message: 'If this email exists and is unverified, a new link has been sent.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mount password reset sub-routes
router.use('/', passwordResetRouter);

module.exports = router;
