const express = require('express');
const dns = require("dns");
const cors = require('cors');
const helmet  = require('helmet');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean     = require('xss-clean');

dns.setServers(["1.1.1.1", "8.8.8.8"]);

dotenv.config();

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts : process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false
}));

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3001'
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));

// ── Rate limiting ────────────────────────────────────────────────────────────
const apiLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20,  message: { message: 'Too many auth attempts, try again later.' } });
const verifyLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { message: 'Too many verification attempts.' } });

app.use('/api/', apiLimiter);
app.use('/api/v1/auth/login',               authLimiter);
app.use('/api/v1/auth/register',            authLimiter);
app.use('/api/v1/auth/forgot-password',     authLimiter);
app.use('/api/v1/auth/resend-verification', verifyLimiter);

// ── Body parsing ─────────────────────────────────────────────────────────────
// Paystack webhook needs raw body
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// General body parsing
app.use(express.json({ limit: '10kb' }));           // prevent huge JSON payloads
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Input sanitization ───────────────────────────────────────────────────────
// Prevent NoSQL injection: strips $ and . from request body/query/params
app.use(mongoSanitize());

// Prevent XSS: sanitizes HTML from user input
app.use(xssClean());

// ── API v1 routes ─────────────────────────────────────────────────────────────
const v1 = express.Router();

v1.use('/auth',      require('./routes/auth'));
v1.use('/vendor',    require('./routes/vendor'));
v1.use('/products',  require('./routes/products'));
v1.use('/store',     require('./routes/store'));
v1.use('/orders',    require('./routes/orders'));
v1.use('/payments',  require('./routes/payments'));
v1.use('/analytics', require('./routes/analytics'));
v1.use('/admin',     require('./routes/admin'));
v1.use('/discounts', require('./routes/discounts'));
v1.use('/reviews',   require('./routes/reviews'));

app.use('/api/v1', v1);

// ── Legacy redirect: /api/* → /api/v1/* (backwards compat for Phase 1-3 clients)
app.use('/api', (req, res, next) => {
  // If it matches a v1 path, transparently forward it
  req.url = req.url; // keep as-is; handled below
  next();
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health',    (req, res) => res.json({ status: 'ok', version: 'v4.0.0', api: '/api/v1' }));
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', version: 'v4.0.0' }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
});


// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/codolt');
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Vendora server running on port ${PORT}`);
});
