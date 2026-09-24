const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const upload = require("../middleware/upload");
const getPublicId = require('../utils/helper');
const cloudinary = require('../config/cloudinary');



// @GET /api/products — get vendor's own products
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.vendor._id }).sort({ sortOrder: 1, createdAt: -1 });
    console.log(products);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @POST /api/products — create product
router.post('/', protect, upload.array("images", 5), async (req, res) => {
  try {
    const { name, description, price, comparePrice, category, inStock } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: 'Product name and price are required' });
    }

    const imageUrl = req.files ? req.files.map(f => f.path) : "";

    const product = await Product.create({
      vendor: req.vendor._id,
      name,
      description,
      price: parseFloat(price),
      comparePrice: comparePrice ? parseFloat(comparePrice) : null,
      images : imageUrl,
      category: category || 'General',
      inStock: inStock !== 'false'
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/products/:id — update product
router.put('/:id', protect, upload.array('images', 5), async (req, res) => {
  try {
    console.log(req.body)
    const product = await Product.findOne({ _id: req.params.id, vendor: req.vendor._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const { name, description, price, comparePrice, category, inStock, isVisible, keepImages } = req.body;

    if (name) product.name = name;
    if (description !== undefined) product.description = description;
    if (price) product.price = parseFloat(price);
    product.comparePrice = comparePrice ? parseFloat(comparePrice) : null;
    if (category) product.category = category;
    if (inStock !== undefined) product.inStock = inStock !== 'false';
    if (isVisible !== undefined) product.isVisible = isVisible !== 'false';

    // Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => f.path);

      if (keepImages === 'true') {
        product.images = [...product.images, ...newImages].slice(0, 5);
      } else {
        product.images = newImages;
      }
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @DELETE /api/products/:id — delete product
router.delete('/:id', protect, async (req, res) => {
  try {

    const product = await Product.findOneAndDelete({ _id: req.params.id, vendor: req.vendor._id });
    
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Delete associated images
    if(product.images && product.images.length > 0){
      for (const img of product.images) {
        const publicId = getPublicId(img);
        await cloudinary.uploader.destroy(publicId);
      }
    }

    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
