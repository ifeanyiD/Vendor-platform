const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Vendor = require('../models/Vendor');
const { protect } = require('../middleware/auth');

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/stores');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `store_${req.vendor._id}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

// @GET /api/vendor/me — get current vendor profile
router.get('/me', protect, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.vendor._id).select('-password');
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/vendor/profile — update store profile
router.put('/profile', protect, upload.fields([
  { name: 'storeLogo', maxCount: 1 },
  { name: 'storeBanner', maxCount: 1 }
]), async (req, res) => {
  try {
    const { storeName, storeDescription, storeCategory, location, whatsappNumber } = req.body;

    const updateData = {};
    if (storeName) updateData.storeName = storeName;
    if (storeDescription !== undefined) updateData.storeDescription = storeDescription;
    if (storeCategory) updateData.storeCategory = storeCategory;
    if (location !== undefined) updateData.location = location;
    if (whatsappNumber) updateData.whatsappNumber = whatsappNumber;

    if (req.files?.storeLogo?.[0]) {
      updateData.storeLogo = `/uploads/stores/${req.files.storeLogo[0].filename}`;
    }
    if (req.files?.storeBanner?.[0]) {
      updateData.storeBanner = `/uploads/stores/${req.files.storeBanner[0].filename}`;
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.vendor._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @GET /api/vendor/subscription — get subscription info
router.get('/subscription', protect, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.vendor._id).select('subscription storeName');
    res.json(vendor.subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
