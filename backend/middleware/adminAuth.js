const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');

const adminProtect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vendora_jwt_secret_key_2024');
    const vendor = await Vendor.findById(decoded.id).select('-password');
    if (!vendor) return res.status(401).json({ message: 'Vendor not found' });
    if (!vendor.isAdmin) return res.status(403).json({ message: 'Admin access required' });
    req.vendor = vendor;
    next();
  } catch {
    return res.status(401).json({ message: 'Token invalid' });
  }
};

module.exports = { adminProtect };
